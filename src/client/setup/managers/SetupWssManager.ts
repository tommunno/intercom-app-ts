import {
  payloadIsValidForType,
  WSS_DOWNSTREAM_SETUP,
  WSS_UPSTREAM,
  type WssDownstreamSetup,
  type WssPayloads,
  type WssUpstream,
} from "../../../shared/protocols/wssProtocol.js";
import { SERVER_RECOVERY_PROBE_INTERVAL_MS } from "../../shared/constants/clientConstants.js";
import logger from "../../shared/logging/logger.js";
import { dataIsWssDownstreamResponse } from "../../shared/types/WssDownstreamResponse.js";
import type {
  ISetupWssManager,
  SetupWssHandlers,
} from "../contracts/ISetupWssManager.js";

type WssStatus = "CONNECTING" | "OPEN" | "CLOSED" | "ERROR" | "DISCONNECTED";

// Maps each downstream message type to a map of listener IDs and their callbacks:
type WssListeners = {
  [K in WssDownstreamSetup]: Map<string, (payload: WssPayloads[K]) => void>;
};

type QueuedMessages = {
  [K in WssUpstream]: WssPayloads[K][];
};

export class SetupWssManager implements ISetupWssManager {
  private status: WssStatus = "DISCONNECTED";
  private handlers: SetupWssHandlers | null = null;
  private protocol = window.location.protocol === "https:" ? "wss" : "ws";
  private wsUrl = `${this.protocol}://${window.location.host}/`;
  private ws: WebSocket | null = null;
  private logger = logger.child({ context: "SetupWssManager" });
  private listeners: WssListeners = this.createListeners();
  private queuedMessages: QueuedMessages = this.createQueuedMessages();
  private serverRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveryRunning = false;

  setHandlers(handlers: SetupWssHandlers | null): void {
    this.handlers = handlers;
  }

  connect(): void {
    if (this.status !== "DISCONNECTED") {
      return;
    }
    this.status = "CONNECTING";
    this.ws = new WebSocket(this.wsUrl);
    this.handleEvents(this.ws);
    this.handleMessages(this.ws);
  }

  disconnect(): void {
    if (this.status === "DISCONNECTED") {
      return;
    }
    this.ws?.close();
    this.ws = null;
    this.clearQueuedMessages();
    this.status = "DISCONNECTED";
  }

  send<T extends WssUpstream>(type: T, payload: WssPayloads[T]): void {
    //If we're unable to send a message right now, queue it instead:
    if (
      this.status !== "OPEN" ||
      this.ws === null ||
      this.ws.readyState !== WebSocket.OPEN
    ) {
      this.queuedMessages[type].push(payload);
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  subscribe<T extends WssDownstreamSetup>(
    type: T,
    listener: (payload: WssPayloads[T]) => void,
  ): () => void {
    const id = crypto.randomUUID();
    const mapForType = this.listeners[type];
    mapForType.set(id, listener);
    return () => {
      mapForType.delete(id);
    };
  }

  private handleEvents(ws: WebSocket) {
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.status = "OPEN";
      this.logger.success("Websocket connection open");
      this.handlers?.onOpen();
      this.sendQueuedMessages(ws);
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.status = "CLOSED";
      this.logger.info("Websocket connection closed");
      this.monitorServerRecovery(true);
      this.handlers?.onClose();
    };

    ws.onerror = () => {
      if (this.ws !== ws) return;
      this.status = "ERROR";
      this.logger.error("Websocket connection error");
      this.monitorServerRecovery(true);
      this.handlers?.onError();
    };
  }

  private handleMessages(ws: WebSocket) {
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      try {
        const json: unknown = JSON.parse(event.data);
        //Check the 'universal' type
        if (!dataIsWssDownstreamResponse("SETUP", json)) {
          this.logger.warn("Malformed message structure");
          return;
        }

        //Now we can safely destructure these
        const { type, payload } = json;

        if (type !== "ADMIN_HEARTBEAT_REQUEST") {
          this.logger.info(`Message type: ${type}`);
        }

        this.handleMessage(type, payload);
      } catch (error) {
        this.logger.error("Failed to parse JSON:", error);
        return;
      }
    };
  }

  private handleMessage<T extends WssDownstreamSetup>(
    type: T,
    payload: unknown,
  ): void {
    if (!payloadIsValidForType(type, payload)) {
      this.logger.warn(`Payload not valid for message of type ${type}`);
      return;
    }

    if (type !== "ADMIN_HEARTBEAT_REQUEST") {
      this.logger.success(`Message payload valid for type: ${type}`);
    }

    this.listeners[type].forEach((listener) => {
      listener(payload);
    });
  }

  private sendQueuedMessages(ws: WebSocket): void {
    Object.entries(this.queuedMessages).forEach(([type, payloads]) => {
      payloads.forEach((payload) => {
        ws.send(JSON.stringify({ type, payload }));
      });
      payloads.length = 0;
    });
  }

  private clearQueuedMessages(): void {
    Object.values(this.queuedMessages).forEach((payloads) => {
      payloads.length = 0;
    });
  }

  private monitorServerRecovery(monitor: boolean): void {
    if (!monitor) {
      this.recoveryRunning = false;
      if (this.serverRecoveryTimer) {
        clearTimeout(this.serverRecoveryTimer);
        this.serverRecoveryTimer = null;
      }
      return;
    }

    if (this.recoveryRunning) return; //prevent duplicates
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
          this.handlers?.onServerRestored();
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

  private createListeners(): WssListeners {
    return Object.fromEntries(
      Object.values(WSS_DOWNSTREAM_SETUP).map((type) => [type, new Map()]),
    ) as WssListeners;
  }

  private createQueuedMessages(): QueuedMessages {
    const queuedMessages = {} as QueuedMessages;
    for (const type of Object.values(WSS_UPSTREAM)) {
      queuedMessages[type] = [];
    }
    return queuedMessages;
  }
}
