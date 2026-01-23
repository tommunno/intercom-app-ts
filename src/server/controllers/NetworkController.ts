import type {
  WssDownstream,
  WssPayloads,
  WssUpstream,
} from "../../shared/protocols/index.js";
import type { AuthResult, LoginCredentials } from "../../shared/types/index.js";
import type {
  INetworkController,
  ILogger,
  IWebServerManager,
  IWssManager,
  IWebRtcManager,
  ITurnServerManager,
  WebServerHandlers,
  NetworkHandlers,
} from "../contracts/index.js";
import type { WssMessageInfo } from "../types/WssMessageInfo.js";

export class NetworkController implements INetworkController {
  private handlers: NetworkHandlers | null = null;

  constructor(
    private webServerManager: IWebServerManager,
    private wssManager: IWssManager,
    private webRTCManager: IWebRtcManager,
    private turnServerManager: ITurnServerManager,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "NetworkController" });
  }

  init(): void {
    this.bindListeners();
    const servers = this.webServerManager.init();
    this.wssManager.init(servers);
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;
    this.webServerManager.start();
    this.wssManager.start();
  }

  setHandlers(handlers: NetworkHandlers): void {
    this.handlers = handlers;
  }

  setWebServerPorts(httpPort: number, httpsPort: number) {
    return this.webServerManager.setPorts(httpPort, httpsPort);
  }

  sendWssMessage<K extends WssDownstream>(
    type: K,
    payload: WssPayloads[K],
    clientIds: string[],
  ): void {
    this.wssManager.sendMessage(type, payload, clientIds);
  }

  //Helpers:
  sendLoginFailureMessage(clientId: string, message?: string): void {
    this.sendWssMessage(
      "USER_LOGIN_RESPONSE",
      {
        success: false,
        message: message ?? "Internal server error",
        userInfo: null,
        audioInfo: null,
      },
      [clientId],
    );
  }

  //Private methods:
  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("NetworkController handlers not initialized!");
    return this.handlers;
  }

  private bindListeners(): void {
    this.webServerManager.setHandlers({
      onUserSoftLoginRequest: (s, l) => this.handleUserSoftLoginRequest(s, l),
    });

    this.wssManager.setHandlers({
      onMessage: this.handleWssMessage.bind(this),
      onClientDisconnect: (c) => this.handleClientDisconnect(c),
      onClientError: (c) => this.handleClientError(c),
    });
  }

  private async handleUserSoftLoginRequest(
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ): Promise<AuthResult> {
    const authResult = await this.activeHandlers.onUserSoftLoginRequest(
      sessionToken,
      loginCredentials,
    );
    return authResult;
  }

  private handleWssMessage<K extends WssUpstream>(
    messageInfo: WssMessageInfo<K>,
  ): void {
    this.activeHandlers.onMessage(messageInfo);
  }

  private handleClientDisconnect(clientId: string) {
    this.activeHandlers.onClientDisconnect(clientId);
  }

  private handleClientError(clientId: string) {
    this.activeHandlers.onClientError(clientId);
  }
}
