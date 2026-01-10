import type {
  INetworkController,
  ILogger,
  IWebServerManager,
  IWssManager,
  IWebRTCManager,
  ITurnServerManager,
  WebServerHandlers,
} from "../contracts/index.js";

export class NetworkController implements INetworkController {
  constructor(
    private webServerManager: IWebServerManager,
    private wssManager: IWssManager,
    private webRTCManager: IWebRTCManager,
    private turnServerManager: ITurnServerManager,
    private logger: ILogger
  ) {}

  init(): void {
    this.bindListeners();
    this.webServerManager.init();
  }

  start(): void {
    this.webServerManager.start();
  }

  private bindListeners(): void {
    this.webServerManager.setHandlers({
      onUserLoginRequest: (s) => this.handleHTTPUserLoginRequest(s),
      onAdminLoginRequest: (s) => this.handleHTTPAdminLoginRequest(s),
    });
  }

  private handleHTTPUserLoginRequest(sessionToken: string): boolean {
    console.log(
      `Web server user login request for sessionToken ${sessionToken}`
    );
    return true;
  }

  private handleHTTPAdminLoginRequest(sessionToken: string): string {
    console.log(
      `Web server admin login request for sessionToken ${sessionToken}`
    );
    return "cow";
  }
}
