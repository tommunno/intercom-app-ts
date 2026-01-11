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

export class NetworkController implements INetworkController {
  private handlers: NetworkHandlers | null = null;

  constructor(
    private webServerManager: IWebServerManager,
    private wssManager: IWssManager,
    private webRTCManager: IWebRtcManager,
    private turnServerManager: ITurnServerManager,
    private logger: ILogger
  ) {
    this.logger = this.logger.child({ context: "NetworkController" });
  }

  init(): void {
    this.bindListeners();
    this.webServerManager.init();
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;
    this.webServerManager.start();
  }

  setHandlers(handlers: NetworkHandlers): void {
    this.handlers = handlers;
  }

  setWebServerPorts(httpPort: number, httpsPort: number) {
    return this.webServerManager.setPorts(httpPort, httpsPort);
  }

  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("NetworkController handlers not initialized!");
    return this.handlers;
  }

  private bindListeners(): void {
    this.webServerManager.setHandlers({
      onUserLoginRequest: (s, l) => this.handleHttpUserLoginRequest(s, l),
    });
  }

  private async handleHttpUserLoginRequest(
    sessionToken: string | null,
    loginCredentials: LoginCredentials
  ): Promise<AuthResult> {
    const authResult = await this.activeHandlers.onHttpUserLoginRequest(
      sessionToken,
      loginCredentials
    );
    return authResult;
  }
}
