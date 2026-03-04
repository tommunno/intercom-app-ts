//Types:
import type { ManagerStatus } from "../../../shared/types/index.js";
import type {
  IWssManager,
  ILogger,
  WssHandlers,
} from "../../contracts/index.js";
import type { Servers, SessionTokens } from "../../types/index.js";

//Helpers:
import { isAddressLocalhost } from "../../../shared/helpers.js";

//External Libraries:
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { IncomingMessage } from "http";
import { TLSSocket } from "tls";
import * as cookie from "cookie";
import {
  payloadIsValidForType,
  type WssDownstream,
  type WssPayloads,
  type WssUpstream,
} from "../../../shared/protocols/index.js";
import { dataIsWssUpstreamRequest } from "../../types/index.js";

export class WssManager implements IWssManager {
  private status: ManagerStatus = "IDLE";
  private handlers: WssHandlers | null = null;

  private ws: WebSocketServer | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocket>();

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WssManager" });
  }

  init(servers: Servers): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the WssManager whilst its status is ${this.status}`,
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
    if (servers.http) {
      this.ws = new WebSocketServer({ server: servers.http });
      this.ws.on("error", (err) => this.handleListenError("WS", err));
    }
    if (servers.https) {
      this.wss = new WebSocketServer({ server: servers.https });
      this.wss.on("error", (err) => this.handleListenError("WSS", err));
    }
    this.status = "INITIALIZED";
  }

  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the WssManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;

    if (this.ws) this.attachWebSocketHandlers(this.ws);
    if (this.wss) this.attachWebSocketHandlers(this.wss);

    this.status = "RUNNING";
  }

  setHandlers(handlers: WssHandlers): void {
    this.handlers = handlers;
  }

  sendMessage<K extends WssDownstream>(
    type: K,
    payload: WssPayloads[K],
    clientIds: string[],
  ): void {
    const notRunning = this.checkAndWarnIfNotRunning("send message");
    if (notRunning) return;

    let data: string;
    try {
      data = JSON.stringify({ type, payload });
    } catch (err) {
      this.logger.error(`Serialization failed for ${type}:`, err);
      return;
    }
    clientIds.forEach((id) => {
      const ws = this.clients.get(id);
      if (!ws) {
        this.logger.error(
          `Message delivery failed for message type ${type}: No active session found for clientId ${id}`,
        );
        return;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data, (err) => {
          if (err) {
            this.logger.warn(`Send failed to client ${id} for ${type}:`, err);
          }
        });
      } else {
        this.logger.warn(
          `Delivery skipped: Client ${id} connection state is ${ws.readyState}`,
        );
      }
    });
  }

  private get activeHandlers(): WssHandlers {
    if (!this.handlers) throw new Error("WssManager handlers not initialized!");
    return this.handlers;
  }

  private handleListenError(
    label: "WS" | "WSS",
    err: NodeJS.ErrnoException,
  ): void {
    if (err.code === "EADDRINUSE") {
      this.logger.error(
        `${label} server failed to listen: port is already in use.`,
      );
      return;
    }
    this.logger.error(`${label} server listen error`, err);
  }

  private attachWebSocketHandlers(wsServer: WebSocketServer) {
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
      const userSessionToken = cookies["userSessionToken"];
      const adminSessionToken = cookies["adminSessionToken"];
      this.logger.info(
        `New wss client userSessionToken: ${userSessionToken}, adminSessionToken: ${adminSessionToken}`,
      );
      const clientId = this.generateClientId();

      this.logger.info(`New connection: ${clientId}`);

      //Attach listeners to THIS socket
      ws.on("message", (rawData) =>
        this.handleRawMessage({
          clientId,
          rawData,
          sessionTokens: {
            user: userSessionToken ?? null,
            admin: adminSessionToken ?? null,
          },
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
    sessionTokens,
  }: {
    clientId: string;
    rawData: RawData;
    sessionTokens: SessionTokens;
  }): void {
    try {
      const data: unknown = JSON.parse(rawData.toString());

      //Check the 'universal' type
      if (!dataIsWssUpstreamRequest(data)) {
        this.logger.warn("Malformed message structure");
        return;
      }

      //Now we can safely destructure these
      const { type, payload } = data;

      if (
        type !== "HEARTBEAT_RESPONSE" &&
        type !== "ADMIN_HEARTBEAT_RESPONSE"
      ) {
        this.logger.info(`Message type: ${type}`);
      }

      this.handleMessage({
        type,
        payload,
        clientId,
        sessionTokens,
      });
    } catch (e) {
      this.logger.error("JSON Parse Error");
    }
  }

  private handleMessage<K extends WssUpstream>({
    type,
    payload,
    clientId,
    sessionTokens,
  }: {
    type: K;
    payload: unknown;
    clientId: string;
    sessionTokens: SessionTokens;
  }): void {
    if (!payloadIsValidForType(type, payload)) {
      this.logger.warn(`Payload not valid for message of type ${type}`);
      return;
    }
    if (type !== "HEARTBEAT_RESPONSE" && type !== "ADMIN_HEARTBEAT_RESPONSE") {
      this.logger.success(`Message payload valid for type: ${type}`);
    }
    this.activeHandlers.onMessage({
      type,
      payload,
      clientId,
      sessionTokens,
    });
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
