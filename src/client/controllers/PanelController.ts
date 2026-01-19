//Types:
import {
  WSS_DOWNSTREAM,
  type WssClientCommandMap,
  type WssDownstream,
  type WssPayloads,
} from "../../shared/protocols/wssProtocol.js";
import type { HttpLoginResponse } from "../../shared/types/index.js";
import type {
  IHttpManager,
  IPanelController,
  IPanelGuiManager,
  IWebRtcManager,
  IPanelWssManager,
} from "../contracts/index.js";
import type { PanelState } from "../types/PanelState.js";

export class PanelController implements IPanelController {
  private state: PanelState = {
    connection: { status: "IDLE" },
    user: { loggedIn: false, username: "" },
  };
  private readonly wssCommands: WssClientCommandMap = {
    USER_LOGIN_RESPONSE: this.handleLoginResponse.bind(this),
    USER_TEST_RESPONSE: this.handleTestResponse.bind(this),
  };

  constructor(
    private guiManager: IPanelGuiManager,
    private wssManager: IPanelWssManager,
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
    this.httpManager.start();
    this.webRtcManager.start();
  }

  private bindListeners(): void {
    this.guiManager.setHandlers({
      onLoginAttempt: (u, p) => this.handleLoginAttempt(u, p),
    });
    this.wssManager.setHandlers({
      onOpen: () => this.handleWssOpen(),
      onClose: () => this.handleWssClose(),
      onError: () => this.handleWssError(),
      onMessage: this.handleWssMessage.bind(this),
    });
  }

  private async handleLoginAttempt(
    username: string,
    password: string,
  ): Promise<void> {
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

      if (!result.success) {
        this.guiManager.setLoginError(result.message);
        this.guiManager.setLoginLoading(false);
        return;
      }
      //Success:
      this.guiManager.setLoginError(null);
      this.attemptHardLogin();
    } catch (error) {
      console.error("Critical Login Error:", error);
      this.guiManager.setLoginError("Connection failed. Check your internet.");
      this.guiManager.setLoginLoading(false);
    } finally {
    }
  }

  private attemptHardLogin(): void {
    console.log("Attempting hard login");
    console.log("this.wssManager.isRunning:", this.wssManager.isRunning);
    if (!this.wssManager.isRunning) this.wssManager.start();
  }

  private handleWssOpen() {
    console.log("WebSocket connection open");
    this.wssManager.sendMessage("USER_LOGIN", { cow: 2 });
  }

  private handleWssClose() {
    console.log("WebSocket connection close");
  }

  private handleWssError() {
    console.log("WebSocket connection error");
  }

  private handleWssMessage<K extends WssDownstream>(
    type: K,
    payload: WssPayloads[K],
  ): void {
    const command = this.wssCommands[type];
    command(payload);
  }

  private handleLoginResponse({
    myTest,
  }: WssPayloads[typeof WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]) {
    console.log(myTest);
    this.guiManager.setLoginLoading(false);
    this.guiManager.setLoginVisible(false);
  }

  private handleTestResponse({
    myTest2,
  }: WssPayloads[typeof WSS_DOWNSTREAM.USER_TEST_RESPONSE]) {
    console.log(myTest2);
  }
}
