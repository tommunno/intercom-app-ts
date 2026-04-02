import type {
  IClientLogger,
  IClientWssManager,
  ClientWssHandlers,
  ClientWssMode,
  DownstreamForMode,
} from "../contracts/index.js";
import type { ManagerStatus } from "../../../shared/types/index.js";
import {
  payloadIsValidForType,
  type WssPayloads,
  type WssUpstream,
} from "../../../shared/protocols/index.js";
import {
  dataIsWssDownstreamResponse,
  type WssConnectionStatus,
} from "../types/index.js";
import {
  HEARTBEAT_TIMEOUT_MS,
  SERVER_RECOVERY_PROBE_INTERVAL_MS,
} from "../../shared/constants/clientConstants.js";

export class ClientWssManager<
  M extends ClientWssMode,
> implements IClientWssManager<M> {
  private status: ManagerStatus = "IDLE";
  private connectionStatus: WssConnectionStatus = "IDLE";
  private handlers: ClientWssHandlers<M> | null = null;
  private protocol = window.location.protocol === "https:" ? "wss" : "ws";
  private wsUrl = `${this.protocol}://${window.location.host}/`;
  private serverRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatRunning = false;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

  private recoveryRunning = false;
  private ws: WebSocket | null = null;

  constructor(
    public readonly mode: M,
    private logger: IClientLogger,
  ) {
    this.logger = this.logger.child({
      context: `ClientWssManager:${this.mode}`,
    });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the WssManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }
  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the WssManager whilst its status is ${this.status}`,
      );
    }

    this.ws = new WebSocket(this.wsUrl);
    this.handleWebSocketEvents();
    this.handleMessages();
    this.status = "RUNNING";
  }

  get isRunning(): boolean {
    return this.status === "RUNNING";
  }

  setHandlers(handlers: ClientWssHandlers<M>): void {
    this.handlers = handlers;
  }

  sendMessage<K extends WssUpstream>(type: K, payload: WssPayloads[K]): void {
    if (this.checkAndWarnIfNotRunning("send message")) return;

    if (!this.ws) {
      this.logger.error(
        `Cannot send WebSocket message: WebSocket instance is null`,
      );
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn(
        `WSS send skipped: socket not OPEN (state=${this.ws.readyState}). type=${type}`,
      );
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  monitorServerRecovery(monitor: boolean): void {
    if (this.checkAndWarnIfNotRunning("monitor server recovery")) return;

    if (!monitor) {
      this.recoveryRunning = false;
      if (this.serverRecoveryTimer) {
        clearTimeout(this.serverRecoveryTimer);
        this.serverRecoveryTimer = null;
      }
      return;
    }

    if (this.recoveryRunning) return; // prevent duplicates
    this.recoveryRunning = true;

    const probe = async () => {
      try {
        const response = await fetch("/", {
          method: "HEAD", //no response body
          cache: "no-store", //always hit the network, don't cache
        });

        if (response.ok) {
          this.recoveryRunning = false;
          this.serverRecoveryTimer = null;
          this.activeHandlers.onServerRestored();
          return;
        }
      } catch {
        // ignore and retry
      }

      this.serverRecoveryTimer = setTimeout(
        probe,
        SERVER_RECOVERY_PROBE_INTERVAL_MS,
      );
    };

    probe();
  }

  monitorHeartbeatWatchdog(monitor: boolean): void {
    if (this.checkAndWarnIfNotRunning("monitor server recovery")) return;

    if (!monitor) {
      this.heartbeatRunning = false;
      if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
      return;
    }

    if (this.heartbeatRunning) return;
    this.heartbeatRunning = true;

    //Start the countdown immediately
    this.notifyHeartbeatReceived();
  }

  notifyHeartbeatReceived(): void {
    if (this.checkAndWarnIfNotRunning("process received heartbeat")) return;
    if (!this.heartbeatRunning) return;

    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      this.heartbeatRunning = false;
      this.heartbeatTimer = null;
      this.activeHandlers.onHeartbeatTimeout();
    }, HEARTBEAT_TIMEOUT_MS);
  }

  private handleWebSocketEvents() {
    if (!this.ws) {
      this.logger.error(
        `Cannot bind WebSocket events: WebSocket instance is null`,
      );
      return;
    }

    this.ws.onopen = async () => {
      this.connectionStatus = "OPEN";
      this.activeHandlers.onOpen();
    };

    this.ws.onclose = async () => {
      this.connectionStatus = "CLOSE";
      this.activeHandlers.onClose();
    };

    this.ws.onerror = async () => {
      this.connectionStatus = "ERROR";
      this.activeHandlers.onError();
    };
  }

  private handleMessages() {
    if (!this.ws) {
      this.logger.error(
        `Cannot handle WebSocket messages: WebSocket instance is null`,
      );
      return;
    }
    this.ws.onmessage = (event) => {
      try {
        const json: unknown = JSON.parse(event.data);
        //Check the 'universal' type
        if (!dataIsWssDownstreamResponse(this.mode, json)) {
          this.logger.warn("Malformed message structure");
          return;
        }

        //Now we can safely destructure these
        const { type, payload } = json;

        if (
          type !== "HEARTBEAT_REQUEST" &&
          type !== "ADMIN_HEARTBEAT_REQUEST"
        ) {
          this.logger.info(`Message type: ${type}`);
        }

        this.handleMessage(type, payload);
      } catch (error) {
        this.logger.error("Failed to parse JSON:", error);
        return;
      }
    };
  }

  private handleMessage<T extends DownstreamForMode<M>>(
    type: T,
    payload: unknown,
  ): void {
    if (!payloadIsValidForType(type, payload)) {
      this.logger.warn(`Payload not valid for message of type ${type}`);
      return;
    }

    if (type !== "HEARTBEAT_REQUEST" && type !== "ADMIN_HEARTBEAT_REQUEST") {
      this.logger.success(`Message payload valid for type: ${type}`);
    }

    this.activeHandlers.onMessage(type, payload);
  }

  private get activeHandlers(): ClientWssHandlers<M> {
    if (!this.handlers) throw new Error("WssManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this.status}`,
      );
      return true;
    }
    return false;
  }
}
