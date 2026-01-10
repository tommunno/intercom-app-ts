import {
  type INetworkController,
  type ILogger,
  type IWebServerManager,
  type IWssManager,
  type IWebRTCManager,
  type ITurnServerManager,
  WebServerEvent,
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
    this.webServerManager.on(WebServerEvent.UserLoginRequest, (sessionToken) =>
      this.handleWebServerUserLoginRequest(sessionToken)
    );
    this.webServerManager.on(WebServerEvent.AdminLoginRequest, (sessionToken) =>
      this.handleWebServerAdminLoginRequest(sessionToken)
    );
  }

  private handleWebServerUserLoginRequest(sessionToken: string): boolean {
    console.log(
      `Web server user login request for sessionToken ${sessionToken}`
    );
    return true;
  }

  private handleWebServerAdminLoginRequest(sessionToken: string): string {
    console.log(
      `Web server admin login request for sessionToken ${sessionToken}`
    );
    return "cow";
  }
}
