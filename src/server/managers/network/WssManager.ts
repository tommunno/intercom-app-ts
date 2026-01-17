//Types:
import type { ManagerState } from "../../../shared/types/index.js";
import type {
  IWssManager,
  ILogger,
  WssHandlers,
} from "../../contracts/index.js";
import type { Servers, WssMessageInfo, WssRequest } from "../../types/index.js";

//Helpers:
import { isAddressLocalhost } from "../../../shared/helpers.js";

//External Libraries:
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { IncomingMessage } from "http";
import { TLSSocket } from "tls";
import * as cookie from "cookie";
import {
  dataIsWssUserLogin,
  WSS_PAYLOAD_VALIDATORS,
  type WssType,
  type WssUpstream,
} from "../../../shared/protocols/wssProtocol.js";
import { dataIsWssRequest } from "../../types/index.js";

export class WssManager implements IWssManager {
  private state: ManagerState = "IDLE";
  private handlers: WssHandlers | null = null;

  private ws: WebSocketServer | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocket>();

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WssManager" });
  }

  init(servers: Servers): void {
    if (this.state !== "IDLE") {
      throw new Error(
        `Cannot initialize the WssManager whilst its state is ${this.state}`,
      );
    }
    if (!servers.http && !servers.https) {
      throw new Error(
        `No servers were passed into the WssManager during initialization`,
      );
    }
    if (!servers.http) {
      this.logger.warn(
        `No HTTP server was passed into the WssManager during initialization.`,
      );
    } else if (!servers.https) {
      this.logger.warn(
        `No HTTPS server was passed into the WssManager during initialization.`,
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
        `Cannot start the WssManager whilst its state is ${this.state}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;

    if (this.ws) this.attachWebSocketHandlers(this.ws);
    if (this.wss) this.attachWebSocketHandlers(this.wss);

    this.state = "RUNNING";
  }

  setHandlers(handlers: WssHandlers): void {
    this.handlers = handlers;
  }

  private get activeHandlers(): WssHandlers {
    if (!this.handlers) throw new Error("WssManager handlers not initialized!");
    return this.handlers;
  }

  attachWebSocketHandlers(wsServer: WebSocketServer) {
    wsServer.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const clientInfo = this.getRequestInfo(req);

      //Security Guard
      if (!clientInfo.isSecure && !clientInfo.isLocalhost) {
        this.logger.warn(
          `Rejected insecure connection from ${clientInfo.remoteAddress}`,
        );
        ws.close(1008, "Insecure connections only allowed from localhost");
        return;
      }

      //Identification (cookies and sessionToken)
      const cookies = this.parseCookies(req.headers.cookie);
      const sessionToken = cookies["userSessionToken"];
      this.logger.info(`New wss client sessionToken: ${sessionToken}`);
      const clientId = this.generateClientId();

      this.logger.info(`New connection: ${clientId}`);

      //Attach listeners to THIS socket
      ws.on("message", (rawData) =>
        this.handleRawMessage({
          clientId,
          rawData,
          sessionToken: sessionToken ? sessionToken : null,
        }),
      );

      ws.on("close", () => this.handleClientDisconnection(clientId));

      ws.on("error", (err) => this.handleClientError(clientId, err));

      this.clients.set(clientId, ws);
      this.logger.success(`Client ${clientId} has connected`);
    });
  }

  private handleRawMessage({
    clientId,
    rawData,
    sessionToken,
  }: {
    clientId: string;
    rawData: RawData;
    sessionToken: string | null;
  }): void {
    try {
      this.logger.info(`New Wss message received`);
      const json: unknown = JSON.parse(rawData.toString());

      //Check the 'universal' type
      if (!dataIsWssRequest(json)) {
        this.logger.warn("Malformed message structure");
        return;
      }

      //Now we can safely destructure these
      const { type, payload } = json;

      this.logger.info(`Message type: ${type}`);

      this.handleMessage({ type, payload, clientId, sessionToken });
    } catch (e) {
      this.logger.error("JSON Parse Error");
    }
  }

  private handleMessage<K extends WssUpstream>({
    type,
    payload,
    clientId,
    sessionToken,
  }: {
    type: K;
    payload: Record<string, unknown>;
    clientId: string;
    sessionToken: string | null;
  }) {
    const validator = WSS_PAYLOAD_VALIDATORS[type];
    const valid = validator(payload);
    if (!valid) {
      this.logger.warn(`Payload not valid for message of type ${type}`);
      return;
    }
    this.logger.info(`Message payload valid for type: ${type}`);
    this.activeHandlers.onMessage({ type, payload, clientId, sessionToken });
  }

  private handleClientDisconnection(clientId: string) {
    this.logger.warn(`Client ${clientId} has disconnected`);
    this.removeClient(clientId);
    this.activeHandlers.onClientDisconnect(clientId);
  }

  private handleClientError(clientId: string, err: Error) {
    this.logger.error(`Client ${clientId} error`, err);
    this.removeClient(clientId);
    this.activeHandlers.onClientError(clientId);
  }

  private removeClient(clientId: string) {
    const success = this.clients.delete(clientId);
    if (!success)
      this.logger.warn(
        `Failed to remove client: ID ${clientId} not found in active clients map`,
      );
  }

  private getRequestInfo(req: IncomingMessage) {
    const socket = req.socket;
    const isSecure = socket instanceof TLSSocket && socket.encrypted;
    const remoteAddress = socket.remoteAddress || "";
    const isLocalhost = isAddressLocalhost(remoteAddress);

    return { isLocalhost, isSecure, remoteAddress };
  }

  //Parses the raw cookie header into a key-value object.
  //Returns an empty object if no cookies are present.
  private parseCookies(
    cookieHeader: string | undefined,
  ): Record<string, string | undefined> {
    if (!cookieHeader) {
      return {};
    }
    try {
      return cookie.parse(cookieHeader);
    } catch (error) {
      this.logger.error("Failed to parse cookies:", error);
      return {};
    }
  }

  private generateClientId(): string {
    return crypto.randomUUID();
  }
}
