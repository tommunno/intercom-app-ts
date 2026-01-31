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
    private webRtcManager: IWebRtcManager,
    private turnServerManager: ITurnServerManager,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "NetworkController" });
  }

  init(): void {
    this.bindListeners();
    const servers = this.webServerManager.init();
    this.wssManager.init(servers);
    //Temporary Turn Server details passed in here until the Turn Server is built:
    this.webRtcManager.init("turn:127.0.0.1:5042", {
      username: "intercom",
      credential: "abcdef",
    });
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.webServerManager.start();
    this.wssManager.start();
    this.webRtcManager.start();
  }

  setHandlers(handlers: NetworkHandlers): void {
    this.handlers = handlers;
  }

  //WebServerManager:

  setWebServerPorts(httpPort: number, httpsPort: number) {
    return this.webServerManager.setPorts(httpPort, httpsPort);
  }

  //WssManager:

  sendWssMessage<K extends WssDownstream>(
    type: K,
    payload: WssPayloads[K],
    clientIds: string[],
  ): void {
    this.wssManager.sendMessage(type, payload, clientIds);
  }

  //WssManager Helpers:
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

  //WebRtcManager:

  createRtcPeerConnection(clientId: string): void {
    this.webRtcManager.createPeerConnection(clientId);
  }

  processRtcRemoteOffer(clientId: string, offer: any): void {
    this.webRtcManager.processRemoteOffer(clientId, offer);
  }

  processRtcRemoteIceCandidate(clientId: string, candidate: any): void {
    this.webRtcManager.processRemoteIceCandidate(clientId, candidate);
  }

  closeRtcClient(clientId: string): void {
    this.webRtcManager.closeClient(clientId);
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

    this.webRtcManager.setHandlers({
      onRtcConnected: (c) => this.handleRtcConnected(c),
      onRtcDisconnected: (c) => this.handleRtcDisconnected(c),
      onRtcClosed: (c) => this.handleRtcClosed(c),
      onRtcFailed: (c) => this.handleRtcFailed(c),
      onRtcAnswer: (c, a) => this.handleRtcAnswer(c, a),
      onRtcIceCandidate: (c, i) => this.handleRtcIceCandidate(c, i),
    });
  }

  //Http Manager:

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

  //WssManager:

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

  //WebRtcManager:

  private handleRtcConnected(clientId: string): void {
    this.activeHandlers.onRtcConnected(clientId);
  }

  private handleRtcDisconnected(clientId: string): void {
    this.activeHandlers.onRtcDisconnected(clientId);
  }

  private handleRtcClosed(clientId: string): void {
    this.activeHandlers.onRtcClosed(clientId);
  }

  private handleRtcFailed(clientId: string): void {
    this.activeHandlers.onRtcFailed(clientId);
  }

  private handleRtcAnswer(clientId: string, answer: any): void {
    this.activeHandlers.onRtcAnswer(clientId, answer);
  }

  private handleRtcIceCandidate(clientId: string, candidate: any): void {
    this.activeHandlers.onRtcIceCandidate(clientId, candidate);
  }
}
