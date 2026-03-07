import type {
  WSS_DOWNSTREAM_SETUP,
  WssDownstreamSetup,
  WssPayloads,
} from "../../shared/protocols/wssProtocol.js";
import type {
  AdminUsersChangeRequest,
  HttpLoginResponse,
  SetupSections,
} from "../../shared/types/index.js";
import type {
  IClientLogger,
  IClientWssManager,
  IHttpManager,
  ILoginGuiManager,
  ISetupController,
  ISetupGlobalGuiManager,
  ISetupSectionGuiManager,
} from "../contracts/index.js";
import type {
  AttemptFullLoginParams,
  SetupState,
  WssSetupCommandMap,
} from "../types/index.js";

export class SetupController implements ISetupController {
  private state: SetupState = {
    attemptingAutomaticLogin: false,
    webServerInfo: {},
    inputGainsInfo: {},
    usersInfo: [],
    partylinesInfo: [],
    soundcardInfo: {},
    audioConfigInfo: {},
    loggingInfo: {},
  };
  private readonly wssCommands: WssSetupCommandMap = {
    ADMIN_HEARTBEAT_REQUEST: this.handleAdminHeartbeatRequest.bind(this),
    ADMIN_LOGIN_RESPONSE: this.handleAdminLoginResponse.bind(this),
    ADMIN_FORCE_LOGOUT: this.handleAdminForceLogout.bind(this),
    ADMIN_UPDATE: this.handleAdminUpdate.bind(this),
  };

  constructor(
    private globalGuiManager: ISetupGlobalGuiManager,
    private loginGuiManager: ILoginGuiManager,
    private sections: SetupSections,
    private wssManager: IClientWssManager<"SETUP">,
    private httpManager: IHttpManager,
    private logger: IClientLogger,
  ) {
    this.logger = this.logger.child({ context: "PanelController" });
  }

  init(): void {
    this.bindListeners();
    this.globalGuiManager.init();
    this.loginGuiManager.init();
    Object.values(this.sections).forEach((s: ISetupSectionGuiManager) =>
      s.init(),
    );
    this.wssManager.init();
    this.httpManager.init();
  }

  start(): void {
    this.globalGuiManager.start();
    this.loginGuiManager.start();
    Object.values(this.sections).forEach((s: ISetupSectionGuiManager) =>
      s.start(),
    );
    this.httpManager.start();
    this.loginGuiManager.setLoginLoading(false);
    this.attemptAutomaticLogin();
  }

  private bindListeners(): void {
    this.globalGuiManager.setHandlers({
      onLogoutBtnClick: () => this.handleLogoutBtnClick(),
    });
    this.loginGuiManager.setHandlers({
      onLoginAttempt: (u, p) => this.handleLoginAttempt(u, p),
    });
    this.sections.webServer.setHandlers({});
    this.sections.users.setHandlers({
      onUpdate: (c) => this.handleUsersUpdate(c),
    });
    this.wssManager.setHandlers({
      onOpen: () => this.handleWssOpen(),
      onClose: () => this.handleWssClose(),
      onError: () => this.handleWssError(),
      onMessage: this.handleWssMessage.bind(this),
      onServerRestored: () => this.handleWssServerRestored(),
      onHeartbeatTimeout: () => this.handleHeartbeatTimeout(),
    });
  }

  private attemptAutomaticLogin(): void {
    this.state.attemptingAutomaticLogin = true;
    //If username and password are sent to the server as null, the server will use the sessionToken to try and log in
    this.attemptFullLogin({
      username: null,
      password: null,
      hideGuiErrors: true,
    });
  }

  //Will attempt a soft login followed by a hard login
  //If username and password are sent to the server as null, the server will use the sessionToken to try and log in
  // username: string | null,
  // password: string | null,
  // hideGuiErrors: boolean = false,
  private async attemptFullLogin({
    username,
    password,
    hideGuiErrors = false,
  }: AttemptFullLoginParams): Promise<void> {
    if (
      (username !== null && username.trim() === "") ||
      (password !== null && password.trim() === "")
    ) {
      if (!hideGuiErrors) {
        this.loginGuiManager.setLoginError(
          "Please enter a username and password",
        );
        this.loginGuiManager.shakeLogin();
      }
      return;
    }
    this.loginGuiManager.setLoginLoading(true);
    try {
      const result: HttpLoginResponse = await this.httpManager.softLoginAdmin({
        username,
        password,
      });

      if (!result.success) {
        if (!hideGuiErrors) {
          this.loginGuiManager.setLoginError(result.message);
          this.loginGuiManager.shakeLogin();
        }
        this.loginGuiManager.setLoginLoading(false);
        this.state.attemptingAutomaticLogin = false;
        return;
      }

      //Success:
      this.loginGuiManager.setLoginError(null);
      this.attemptHardLogin();
    } catch (error) {
      this.logger.error("Critical Login Error", error);
      if (!hideGuiErrors) {
        this.loginGuiManager.setLoginError(
          "Connection failed. Check your internet.",
        );
        this.loginGuiManager.shakeLogin();
      }
      this.loginGuiManager.setLoginLoading(false);
      this.state.attemptingAutomaticLogin = false;
    }
  }

  private attemptHardLogin(): void {
    this.logger.info("Attempting hard login");
    if (!this.wssManager.isRunning) {
      //ADMIN_LOGIN message is sent straight away once the websocket is open
      this.wssManager.start();
      return;
    }
    this.wssManager.sendMessage("ADMIN_LOGIN", null);
  }

  //If sendRequest is true, the client sends a logout request to the server
  private logout(sendRequest: boolean = true): void {
    if (sendRequest) {
      this.wssManager.sendMessage("ADMIN_LOGOUT", null);
    }

    this.wssManager.monitorHeartbeatWatchdog(false);
    window.location.reload();
  }

  private displayState(): void {
    Object.values(this.sections).forEach((s: ISetupSectionGuiManager) =>
      s.displayState(this.state),
    );
  }

  //WSS Handlers:

  //WSS Handlers:

  private handleWssOpen() {
    this.logger.success("WebSocket connection open");
    this.wssManager.sendMessage("ADMIN_LOGIN", null);
  }

  private handleWssClose() {
    this.logger.error("WebSocket connection closed");
    this.handleWssDisconnection();
  }

  private handleWssError() {
    this.logger.error("WebSocket connection error");
    this.handleWssDisconnection();
  }

  private handleWssDisconnection() {
    this.handleLostConnection();
  }

  private handleWssMessage<K extends WssDownstreamSetup>(
    type: K,
    payload: WssPayloads[K],
  ): void {
    const command = this.wssCommands[type];
    command(payload);
  }

  private handleWssServerRestored(): void {
    this.logger.info("Server restored");
    window.location.reload();
  }

  private handleHeartbeatTimeout(): void {
    this.logger.error("Heartbeat timeout");
    this.handleWssDisconnection();
  }

  private handleAdminHeartbeatRequest({
    timestamp,
  }: WssPayloads[typeof WSS_DOWNSTREAM_SETUP.ADMIN_HEARTBEAT_REQUEST]): void {
    this.wssManager.sendMessage("ADMIN_HEARTBEAT_RESPONSE", {
      timestamp,
    });
    this.wssManager.notifyHeartbeatReceived();
  }

  private handleAdminLoginResponse(
    params: WssPayloads[typeof WSS_DOWNSTREAM_SETUP.ADMIN_LOGIN_RESPONSE],
  ) {
    const { success, message } = params;
    this.loginGuiManager.setLoginLoading(false);
    this.logger.info(
      `Login Response: success: ${success}, message: ${message}`,
    );

    if (!success) {
      this.loginGuiManager.setLoginError(message);
      if (!this.state.attemptingAutomaticLogin) {
        this.loginGuiManager.shakeLogin();
      } else {
        this.state.attemptingAutomaticLogin = false;
      }
      return;
    }

    //Success:
    const { adminSnapshot } = params;
    this.state = { ...this.state, ...adminSnapshot };
    this.logger.info("this.state:", this.state);

    this.loginGuiManager.setLoginVisible(false);
    this.displayState();
    this.wssManager.monitorHeartbeatWatchdog(true);
    this.state.attemptingAutomaticLogin = false;
  }

  private handleAdminForceLogout(
    _: WssPayloads[typeof WSS_DOWNSTREAM_SETUP.ADMIN_FORCE_LOGOUT],
  ): void {
    this.logout(false);
  }

  private handleAdminUpdate(
    update: WssPayloads[typeof WSS_DOWNSTREAM_SETUP.ADMIN_UPDATE],
  ): void {
    this.state = { ...this.state, ...update };
    if (update.usersInfo) {
      this.sections.users.displayState(this.state);
    }
  }

  //Global GUI Handlers:

  private handleLogoutBtnClick(): void {
    this.logout();
  }

  //Login GUI Handlers:

  //If username and password are sent to the server as null, the server will use the sessionToken to try and log in
  private async handleLoginAttempt(
    username: string,
    password: string,
  ): Promise<void> {
    this.attemptFullLogin({ username, password });
  }

  //Section GUI Handlers:
  private handleUsersUpdate(changeRequest: AdminUsersChangeRequest): void {
    this.wssManager.sendMessage("ADMIN_USERS_CHANGE_REQUEST", changeRequest);
  }

  //Misc Handlers:
  private handleLostConnection() {
    this.globalGuiManager.setErrorModal(true);
    this.wssManager.monitorServerRecovery(true);
    this.wssManager.monitorHeartbeatWatchdog(false);
  }
}
