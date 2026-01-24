//Types:
import {
  WSS_DOWNSTREAM,
  type WssDownstream,
  type WssPayloads,
} from "../../shared/protocols/wssProtocol.js";
import type {
  AudioInfo,
  HttpLoginResponse,
  KeyState,
  TailState,
  UserInfo,
} from "../../shared/types/index.js";
import type {
  IHttpManager,
  IPanelController,
  IPanelGuiManager,
  IWebRtcManager,
  IPanelWssManager,
  KeyPressParams,
} from "../contracts/index.js";
import type { PanelState } from "../types/PanelState.js";
import type { WssClientCommandMap } from "../types/index.js";

export class PanelController implements IPanelController {
  private state: PanelState = {
    audioConnection: { status: "IDLE" },
    userInfo: { loggedIn: false, username: "" },
    audioInfo: { partylines: [] },
  };
  private readonly wssCommands: WssClientCommandMap = {
    USER_LOGIN_RESPONSE: this.handleLoginResponse.bind(this),
    USER_FORCE_LOGOUT: this.handleForceLogout.bind(this),
    USER_AUDIO_INFO_UPDATE: this.handleAudioInfoUpdate.bind(this),
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
    this.guiManager.setLoginLoading(false);
    this.attemptAutomaticLogin();
  }

  private bindListeners(): void {
    this.guiManager.setHandlers({
      onLoginAttempt: (u, p) => this.handleLoginAttempt(u, p),
      onKeyPress: (p) => this.handleKeyPress(p),
      onLogoutBtnClick: () => this.handleLogoutBtnClick(),
    });
    this.wssManager.setHandlers({
      onOpen: () => this.handleWssOpen(),
      onClose: () => this.handleWssClose(),
      onError: () => this.handleWssError(),
      onMessage: this.handleWssMessage.bind(this),
    });
  }

  //Only attempt an auto login if 'noAutoLogin' is not set to true in the URL
  private attemptAutomaticLogin(): void {
    const url = new URL(window.location.href);
    if (url.searchParams.get("noAutoLogin") === "true") {
      url.searchParams.delete("noAutoLogin");
      history.replaceState(null, "", url.toString());
      return;
    }
    //If username and password are sent to the server as null, the server will use the sessionToken to try and log in
    this.attemptFullLogin(null, null, true);
  }

  //Will attempt a soft login followed by a hard login
  //If username and password are sent to the server as null, the server will use the sessionToken to try and log in
  private async attemptFullLogin(
    username: string | null,
    password: string | null,
    hideGuiErrors: boolean = false,
  ): Promise<void> {
    if (
      (username === null && password !== null) ||
      (username !== null && password === null)
    ) {
      if (!hideGuiErrors)
        this.guiManager.setLoginError(
          "An error has occurred, please reload the page",
        );
      console.error(
        `Username and password are of different types in handleLoginAttempt`,
      );
      return;
    }
    if (
      (username !== null && username.trim() === "") ||
      (password !== null && password.trim() === "")
    ) {
      if (!hideGuiErrors)
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
        if (!hideGuiErrors) this.guiManager.setLoginError(result.message);
        this.guiManager.setLoginLoading(false);
        return;
      }

      //Success:
      this.guiManager.setLoginError(null);
      this.attemptHardLogin();
    } catch (error) {
      console.error("Critical Login Error:", error);
      if (!hideGuiErrors)
        this.guiManager.setLoginError(
          "Connection failed. Check your internet.",
        );
      this.guiManager.setLoginLoading(false);
    }
  }

  private attemptHardLogin(): void {
    console.log("Attempting hard login");
    if (!this.wssManager.isRunning) this.wssManager.start();
  }

  //If sendRequest is true, the client sends a logout request to the server
  private logout({
    sendRequest = true,
    loginTakeover = false,
  }: {
    sendRequest?: boolean;
    loginTakeover?: boolean;
  }): void {
    if (sendRequest) {
      this.wssManager.sendMessage("USER_LOGOUT", null);
    }
    if (loginTakeover) {
      const url = new URL(window.location.href);
      url.searchParams.set("noAutoLogin", "true");
      window.location.replace(url.toString());
      return;
    }
    window.location.reload();
  }

  //WSS Handlers:

  private handleWssOpen() {
    console.log("WebSocket connection open");
    this.wssManager.sendMessage("USER_LOGIN", null);
  }

  private handleWssClose() {
    console.log("WebSocket connection closed");
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
    success,
    message,
    userInfo,
    audioInfo,
  }: WssPayloads[typeof WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]) {
    this.guiManager.setLoginLoading(false);

    console.log(
      `Login Response: success: ${success}, message: ${message}, userInfo:`,
      userInfo,
      "audioInfo:",
      audioInfo,
    );

    if (!success) {
      this.guiManager.setLoginError(message);
      return;
    }
    if (!userInfo || !audioInfo) {
      this.guiManager.setLoginError("Error retrieving user information");
      console.error(
        `Login state violation: Server returned success: true, but userInfo or audioInfo is missing from the payload`,
      );
      return;
    }

    this.state.userInfo = userInfo;
    this.state.audioInfo = audioInfo;
    this.guiManager.displayState(this.state);
    this.guiManager.setLoginVisible(false);
  }

  private handleForceLogout({
    loginTakeover,
  }: WssPayloads[typeof WSS_DOWNSTREAM.USER_FORCE_LOGOUT]) {
    this.logout({ sendRequest: false, loginTakeover });
  }

  private handleAudioInfoUpdate(
    audioInfo: WssPayloads[typeof WSS_DOWNSTREAM.USER_AUDIO_INFO_UPDATE],
  ) {
    console.log("Handling audio info update:", audioInfo);
    this.state.audioInfo = audioInfo;
    this.guiManager.displayAudioInfo(this.state.audioInfo);
  }

  //GUI Handlers:

  //If username and password are sent to the server as null, the server will use the sessionToken to try and log in
  private async handleLoginAttempt(
    username: string,
    password: string,
  ): Promise<void> {
    this.attemptFullLogin(username, password);
  }

  private handleKeyPress(params: KeyPressParams): void {
    const { type, id, currState } = params;
    const setState: KeyState = currState === "ON" ? "OFF" : "ON";
    const payload = {
      type,
      id,
      setState,
    };

    //LISTEN:
    if (type === "LISTEN") {
      this.wssManager.sendMessage("KEY_PRESS", payload);
      return;
    }
    //TALK:
    const { tailState } = params;
    this.wssManager.sendMessage("KEY_PRESS", payload);
  }

  private handleLogoutBtnClick(): void {
    this.logout({});
  }
}
