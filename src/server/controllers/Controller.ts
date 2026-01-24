import type {
  IAudioController,
  IController,
  IDataController,
  ILogger,
  INetworkController,
} from "../contracts/index.js";
import type {
  AudioInfo,
  AuthResult,
  LoginCredentials,
} from "../../shared/types/index.js";
import {
  type WssPayloads,
  type WssUpstream,
  WSS_UPSTREAM,
} from "../../shared/protocols/index.js";
import type { WssCommandMap } from "../types/index.js";

export class Controller implements IController {
  private readonly wssCommands: WssCommandMap = {
    USER_LOGIN: this.handleUserLogin.bind(this),
    USER_LOGOUT: this.handleUserLogout.bind(this),
    KEY_PRESS: this.handleKeyPress.bind(this),
  };
  constructor(
    private audioController: IAudioController,
    private networkController: INetworkController,
    private dataController: IDataController,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "Controller" });
  }

  init(): void {
    this.logger.info("Initializing");
    this.bindListeners();
    this.networkController.init();
    this.dataController.init();
    this.audioController.init();
  }
  start(): void {
    this.logger.info("Starting");
    this.networkController.start();
    this.dataController.start();
    this.audioController.start();
  }

  private bindListeners(): void {
    this.networkController.setHandlers({
      onUserSoftLoginRequest: (s, l) => this.handleUserSoftLoginRequest(s, l),
      onMessage: this.handleWssMessage.bind(this),
      onClientDisconnect: (c) => this.handleClientDisconnect(c),
      onClientError: (c) => this.handleClientError(c),
    });
    this.audioController.setHandlers({
      onAudioInfoUpdate: (u, a) => this.handleAudioInfoUpdate(u, a),
    });
  }

  private closeClient(clientId: string, hardLogout: boolean = false) {
    let userId = this.dataController.isClientIdLoggedIn(clientId);
    if (userId === null) {
      return;
    }
    userId = this.dataController.logoutUser(clientId, hardLogout);
    if (userId === null) return;
    this.audioController.disconnectUser(userId);
  }

  //Client first makes Http request for a 'soft' login
  //If there is a valid sessionToken, success
  //If no valid sessionToken, but credentials are valid, success and a sessionToken is sent
  //No user is connected to audio matrix yet!
  private async handleUserSoftLoginRequest(
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ): Promise<AuthResult> {
    const result: AuthResult = await this.dataController.softLoginUser(
      sessionToken,
      loginCredentials,
    );
    //If a loginTakeover has taken place (meaning a client has been logged out to allow the new client to connect), disconnect the logged out client
    if (result.success && result.loginTakeover) {
      this.audioController.disconnectUser(result.userId);
      this.logger.info(
        `handleUserSoftLoginRequest: Sending force logout message to clientId: ${result.loggedOutClientId}`,
      );
      this.networkController.sendWssMessage(
        "USER_FORCE_LOGOUT",
        { loginTakeover: true },
        [result.loggedOutClientId],
      );
    }
    return result;
  }

  private handleWssMessage<K extends WssUpstream>({
    type,
    payload,
    clientId,
    sessionToken,
  }: {
    type: K;
    payload: WssPayloads[K];
    clientId: string;
    sessionToken: string | null;
  }): void {
    const command = this.wssCommands[type];
    command(payload, clientId, sessionToken);
  }

  private handleClientDisconnect(clientId: string) {
    this.closeClient(clientId);
  }

  private handleClientError(clientId: string) {
    this.closeClient(clientId);
  }

  //Handle Wss messages:

  //User requests 'hard' login via WS. The sessionToken is used for validation here.
  private handleUserLogin(
    _payload: WssPayloads[typeof WSS_UPSTREAM.USER_LOGIN],
    clientId: string,
    sessionToken: string | null,
  ): void {
    const result = this.dataController.loginUser(sessionToken, clientId);

    if (!result.success) {
      this.networkController.sendLoginFailureMessage(clientId, result.message);
      return;
    }

    //Login Success:

    const { message, userId, loginTakeover } = result;

    const userInfo = this.dataController.getUserInfo(userId);
    const audioInfo = this.audioController.getAudioInfo(userId);

    if (!userInfo || !audioInfo) {
      this.networkController.sendLoginFailureMessage(clientId);
      return;
    }

    //If a loginTakeover has taken place (meaning a client has been logged out to allow the new client to connect), disconnect the logged out client
    if (loginTakeover) {
      const disconnectSuccess = this.audioController.disconnectUser(userId);
      if (!disconnectSuccess) {
        this.networkController.sendLoginFailureMessage(clientId);
        return;
      }
      this.logger.info(
        `handleUserLogin: Sending force logout message to clientId: ${result.loggedOutClientId}`,
      );
      this.networkController.sendWssMessage(
        "USER_FORCE_LOGOUT",
        { loginTakeover: true },
        [result.loggedOutClientId],
      );
    }
    //Connect new client:
    const connectSuccess = this.audioController.connectUser(userId, clientId);
    if (!connectSuccess) {
      this.networkController.sendLoginFailureMessage(clientId);
      return;
    }

    this.networkController.sendWssMessage(
      "USER_LOGIN_RESPONSE",
      { success: true, message, userInfo, audioInfo },
      [clientId],
    );
  }

  private handleUserLogout(
    _payload: WssPayloads[typeof WSS_UPSTREAM.USER_LOGOUT],
    clientId: string,
    sessionToken: string | null,
  ): void {
    this.logger.info(`User logout request`);
    this.closeClient(clientId, true);
  }

  private handleKeyPress(
    keyPressInfo: WssPayloads[typeof WSS_UPSTREAM.KEY_PRESS],
    clientId: string,
    sessionToken: string | null,
  ): void {
    this.logger.info(`Key press request:`, keyPressInfo);
    const userId = this.dataController.isClientIdLoggedIn(clientId);
    if (userId === null) {
      this.logger.warn(
        `Ignored key press: client is not logged in (clientId=${clientId}).`,
      );
      return;
    }
    this.audioController.processKeyPress(keyPressInfo, userId);
  }

  //Handle AudioController:
  private handleAudioInfoUpdate(userId: number, audioInfo: AudioInfo) {
    const clientId = this.dataController.isUserIdLoggedIn(userId);
    if (!clientId) return;
    this.networkController.sendWssMessage("USER_AUDIO_INFO_UPDATE", audioInfo, [
      clientId,
    ]);
  }
}
