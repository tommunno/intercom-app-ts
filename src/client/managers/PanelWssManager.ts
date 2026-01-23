import type { IPanelWssManager, PanelWssHandlers } from "../contracts/index.js";
import type { ManagerStatus } from "../../shared/types/index.js";
import {
  payloadIsValidForType,
  type WssDownstream,
  type WssPayloads,
  type WssUpstream,
} from "../../shared/protocols/index.js";
import { dataIsWssDownstreamResponse } from "../types/WssDownstreamResponse.js";
status;
export class PanelWssManager implements IPanelWssManager {
  private status: ManagerStatus = "IDLE";
  private handlers: PanelWssHandlers | null = null;
  private protocol = window.location.protocol === "https:" ? "wss" : "ws";
  private wsUrl = `${this.protocol}://${window.location.host}/`;
  private ws: WebSocket | null = null;

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

  setHandlers(handlers: PanelWssHandlers): void {
    this.handlers = handlers;
  }

  sendMessage<K extends WssUpstream>(type: K, payload: WssPayloads[K]): void {
    if (this.checkAndWarnIfNotRunning("send message")) return;

    if (!this.ws) {
      console.error(
        `Cannot send WebSocket message: WebSocket instance is null`,
      );
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  private handleWebSocketEvents() {
    if (!this.ws) {
      console.error(`Cannot bind WebSocket events: WebSocket instance is null`);
      return;
    }

    this.ws.onopen = async () => {
      this.activeHandlers.onOpen();
    };

    this.ws.onclose = async () => {
      this.activeHandlers.onClose();
    };

    this.ws.onerror = async (error) => {
      this.activeHandlers.onError();
    };
  }

  private handleMessages() {
    if (!this.ws) {
      console.error(
        `Cannot handle WebSocket messages: WebSocket instance is null`,
      );
      return;
    }
    this.ws.onmessage = (event) => {
      try {
        const json: unknown = JSON.parse(event.data);
        //Check the 'universal' type
        if (!dataIsWssDownstreamResponse(json)) {
          console.warn("Malformed message structure");
          return;
        }

        //Now we can safely destructure these
        const { type, payload } = json;

        console.info(`Message type: ${type}`);

        this.handleMessage(type, payload);
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        return;
      }
    };
  }

  private handleMessage<K extends WssDownstream>(
    type: K,
    payload: unknown,
  ): void {
    if (!payloadIsValidForType(type, payload)) {
      console.warn(`Payload not valid for message of type ${type}`);
      return;
    }
    console.info(`Message payload valid for type: ${type}`);
    this.activeHandlers.onMessage(type, payload);
  }

  private get activeHandlers(): PanelWssHandlers {
    if (!this.handlers) throw new Error("WssManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.status !== "RUNNING") {
      console.error(`Unable to ${action} because the status is ${this.status}`);
      return true;
    }
    return false;
  }
}
