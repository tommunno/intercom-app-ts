import { WSS_TYPE } from "../../../shared/protocols/index.js";
import type { ManagerState } from "../../../shared/types/index.js";
import type {
  IWssManager,
  ILogger,
  WssHandlers,
} from "../../contracts/index.js";
import type { Servers } from "../../types/index.js";
import { WebSocketServer, WebSocket } from "ws";

export class WssManager implements IWssManager {
  private state: ManagerState = "IDLE";
  private handlers: WssHandlers | null = null;

  private ws: WebSocketServer | null = null;
  private wss: WebSocketServer | null = null;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WssManager" });
  }

  init(servers: Servers): void {
    if (this.state !== "IDLE") {
      throw new Error(
        `Cannot initialize the WssManager whilst its state is ${this.state}`
      );
    }
    if (!servers.http && !servers.https) {
      throw new Error(
        `No servers were passed into the WssManager during initialization`
      );
    }
    if (!servers.http) {
      this.logger.warn(
        `No HTTP server was passed into the WssManager during initialization.`
      );
    } else if (!servers.https) {
      this.logger.warn(
        `No HTTPS server was passed into the WssManager during initialization.`
      );
    }
    if (servers.http) this.ws = new WebSocketServer({ server: servers.http });
    if (servers.https)
      this.wss = new WebSocketServer({ server: servers.https });
    this.state = "INITIALIZED";
  }

  start(): void {
    if (this.state !== "INITIALIZED") {
      throw new Error(
        `Cannot start the WssManager whilst its state is ${this.state}`
      );
    }
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;
    this.state = "RUNNING";

    //Test:
    this.activeHandlers.onMessage(
      WSS_TYPE.USER_LOGIN,
      { myNumber: 345 },
      "jaoifjdfoia"
    );
    this.activeHandlers.onMessage(
      WSS_TYPE.ADMIN_LOGIN,
      { myString: "test string" },
      "jaoifjdffasfdoia"
    );
    //End test
  }

  setHandlers(handlers: WssHandlers): void {
    this.handlers = handlers;
  }

  private get activeHandlers(): WssHandlers {
    if (!this.handlers) throw new Error("WssManager handlers not initialized!");
    return this.handlers;
  }
}
