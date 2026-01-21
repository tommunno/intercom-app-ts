import type {
  IAudioController,
  IController,
  IDataController,
  ILogger,
  INetworkController,
} from "../contracts/index.js";
import type { AuthResult, LoginCredentials } from "../../shared/types/index.js";
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
  }
  start(): void {
    this.logger.info("Starting");
    this.networkController.start();
    this.dataController.start();
  }

  private bindListeners(): void {
    this.networkController.setHandlers({
      onUserSoftLoginRequest: (s, l) => this.handleUserSoftLoginRequest(s, l),
      onMessage: this.handleWssMessage.bind(this),
      onClientDisconnect: (c) => this.handleClientDisconnect(c),
      onClientError: (c) => this.handleClientError(c),
    });
  }

  private closeClient(clientId: string) {
    const userId = this.dataController.logoutUser({ clientId });
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
    if (result.loginTakeover && result.userId !== null) {
      this.audioController.disconnectUser(result.userId);
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

  handleClientDisconnect(clientId: string) {
    this.closeClient(clientId);
  }

  handleClientError(clientId: string) {
    this.closeClient(clientId);
  }

  //Handle Wss messages:

  //User requests 'hard' login via WS. The sessionToken is used for validation here.
  handleUserLogin(
    _payload: WssPayloads[typeof WSS_UPSTREAM.USER_LOGIN],
    clientId: string,
    sessionToken: string | null,
  ): void {
    const { success, message, userId, loginTakeover }: AuthResult =
      this.dataController.loginUser(sessionToken, clientId);
    //If a loginTakeover has taken place (meaning a client has been logged out to allow the new client to connect), disconnect the logged out client
    if (loginTakeover && userId !== null) {
      this.audioController.disconnectUser(userId);
    }
    //If login success, connect user
    if (success && userId !== null) {
      this.audioController.connectUser(userId, clientId);
    }

    //Temporary. Get this from dataController
    const userInfo = {
      loggedIn: true,
      username: "tom",
      allowedPartylines: [0, 4, 7],
    };

    this.networkController.sendWssMessage(
      "USER_LOGIN_RESPONSE",
      { success, message, userInfo },
      [clientId],
    );
  }

  handleUserLogout(
    { myLogoutTest }: WssPayloads[typeof WSS_UPSTREAM.USER_LOGOUT],
    clientId: string,
    sessionToken: string | null,
  ): void {
    this.logger.info(`User logout request:`, myLogoutTest);
  }
}
