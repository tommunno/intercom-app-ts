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
  HeartbeatRequestPayload,
  LoginCredentials,
} from "../../shared/types/index.js";
import {
  type WssPayloads,
  type WssUpstream,
  WSS_UPSTREAM,
} from "../../shared/protocols/index.js";
import type {
  CloseClientParams,
  DisconnectUserParams,
  LogoutClientParams,
  WssCommandMap,
} from "../types/index.js";

export class Controller implements IController {
  private readonly wssCommands: WssCommandMap = {
    HEARTBEAT_RESPONSE: this.handleHeartbeatResponse.bind(this),
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
    this.audioController.setHandlers({
      onAudioInfoUpdate: (u, a) => this.handleAudioInfoUpdate(u, a),
    });

    this.networkController.setHandlers({
      onUserSoftLoginRequest: (s, l) => this.handleUserSoftLoginRequest(s, l),
      onMessage: this.handleWssMessage.bind(this),
      onClientDisconnect: (c) => this.handleClientDisconnect(c),
      onClientError: (c) => this.handleClientError(c),
    });

    this.dataController.setHandlers({
      onAccountHeartbeat: (c, p) => this.handleAccountHeartbeat(c, p),
      onStaleHeartbeat: (c) => this.handleStaleHeartbeat(c),
    });
  }

  //Returns true if success, false if error
  //If hardLogout=true, the sessionToken is removed as well
  //If notifyClient=true, the client will be told they have been logged out
  //loginTakeover tells the client whether they are being logged out due to a loginTakeover
  private logoutClientIfLoggedIn({
    clientId,
    hardLogout = false,
    notifyClient = false,
    loginTakeover = false,
  }: LogoutClientParams): boolean {
    let userId = this.dataController.isClientIdLoggedIn(clientId);
    if (userId === null) {
      //Client is not logged in, hence we will not do anything. This is not an error
      return true;
    }
    userId = this.dataController.logoutUser(clientId, hardLogout);
    if (userId === null) {
      this.logger.error(
        `An error has occured whilst logging out user with clientId ${clientId}. Will not continue with logout`,
      );
      return false;
    }
    const disconnectUserParams = {
      userId,
      notifyClient,
      loginTakeover,
      clientId,
    };
    return this.disconnectUser(disconnectUserParams);
  }

  //Returns true if success, false if error
  //If notifyClient=true, you must provide a clientId
  //loginTakeover tells the client whether they are being logged out due to a loginTakeover
  private disconnectUser(params: DisconnectUserParams): boolean {
    const { userId, notifyClient, loginTakeover = false } = params;
    //If success is false, an internal error has occurred. This is logged inside of audioController. We continue to notify client that they have been logged out
    const success = this.audioController.disconnectUser(userId);
    if (notifyClient) {
      this.networkController.sendWssMessage(
        "USER_FORCE_LOGOUT",
        { loginTakeover },
        [params.clientId],
      );
    }
    return success;
  }

  //Handle AudioController:
  private handleAudioInfoUpdate(userId: number, audioInfo: AudioInfo) {
    const clientId = this.dataController.isUserIdLoggedIn(userId);
    if (!clientId) return;
    this.networkController.sendWssMessage("USER_AUDIO_INFO_UPDATE", audioInfo, [
      clientId,
    ]);
  }

  //Handle HTTP:

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
      this.disconnectUser({
        userId: result.userId,
        loginTakeover: true,
        clientId: result.loggedOutClientId,
        notifyClient: true,
      });
    }
    return result;
  }

  //Handle Wss messages:

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
    this.logoutClientIfLoggedIn({ clientId });
  }

  private handleClientError(clientId: string) {
    this.logoutClientIfLoggedIn({ clientId });
  }

  private handleHeartbeatResponse(
    { timestamp }: WssPayloads[typeof WSS_UPSTREAM.HEARTBEAT_RESPONSE],
    clientId: string,
    sessionToken: string | null,
  ): void {
    this.logger.info(
      `Handling heartbeat response from client ${clientId}, timestamp: ${timestamp}`,
    );
    this.dataController.processHeartbeatResponse(timestamp, clientId);
  }

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
      //An internal error has occured
      //This is logged inside of data and audio controller
      this.networkController.sendLoginFailureMessage(clientId);
      return;
    }

    //If a loginTakeover has taken place (meaning a client has been logged out to allow the new client to connect), disconnect the logged out client
    if (loginTakeover) {
      const disconnectSuccess = this.disconnectUser({
        userId,
        notifyClient: true,
        loginTakeover,
        clientId: result.loggedOutClientId,
      });

      if (!disconnectSuccess) {
        this.networkController.sendLoginFailureMessage(clientId);
        return;
      }
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
    this.logoutClientIfLoggedIn({ clientId, hardLogout: true });
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

  //Handle Data Controller:
  private handleAccountHeartbeat(
    clientIds: string[],
    payload: HeartbeatRequestPayload,
  ): void {
    this.networkController.sendWssMessage(
      "HEARTBEAT_REQUEST",
      payload,
      clientIds,
    );
  }

  private handleStaleHeartbeat(clientId: string): void {
    this.logoutClientIfLoggedIn({ clientId, notifyClient: true });
  }
}
