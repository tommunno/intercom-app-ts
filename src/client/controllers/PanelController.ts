//Types:
import type { HttpLoginResponse } from "../../shared/types/index.js";
import type {
  IHttpManager,
  IPanelController,
  IPanelGuiManager,
  IWebRtcManager,
  IWssManager,
} from "../contracts/index.js";
import type { PanelState } from "../types/PanelState.js";

export class PanelController implements IPanelController {
  private state: PanelState = {
    connection: { status: "IDLE" },
    user: { loggedIn: false, username: "" },
  };

  constructor(
    private guiManager: IPanelGuiManager,
    private wssManager: IWssManager,
    private httpManager: IHttpManager,
    private webRtcManager: IWebRtcManager,
  ) {}

  init(): void {
    this.bindListeners();
    this.guiManager.init();
    this.wssManager.init();
    this.httpManager.init();
    this.webRtcManager.init();
  }

  start(): void {
    this.guiManager.start();
    this.wssManager.start();
    this.httpManager.start();
    this.webRtcManager.start();
  }

  private bindListeners(): void {
    this.guiManager.setHandlers({
      onLoginAttempt: (u, p) => this.handleLoginAttempt(u, p),
    });
  }

  async handleLoginAttempt(username: string, password: string) {
    if (username.trim() === "" || password.trim() === "") {
      this.guiManager.setLoginError("Please enter a username and password");
      return;
    }
    this.guiManager.setLoginLoading(true);
    try {
      const result: HttpLoginResponse = await this.httpManager.softLogin({
        username,
        password,
      });
      this.guiManager.setLoginLoading(false);
      if (!result.success) {
        this.guiManager.setLoginError(result.message);
        return;
      }
      this.guiManager.setLoginError(null);
      this.attemptHardLogin();
    } catch (error) {
      console.error("Critical Login Error:", error);
      this.guiManager.setLoginError("Connection failed. Check your internet.");
      this.guiManager.setLoginError(null);
    } finally {
      this.guiManager.setLoginLoading(false);
    }
  }

  private attemptHardLogin(): void {
    console.log("Attempting hard login");
  }
}
