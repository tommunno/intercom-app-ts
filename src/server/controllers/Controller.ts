import type {
  IAudioController,
  IController,
  IDataController,
  ILogger,
  INetworkController,
} from "../contracts/index.js";
import type { AuthResult, LoginCredentials } from "../../shared/types/index.js";
import {
  type WssCommandMap,
  type WssPayloads,
  type WssType,
  WSS_TYPES,
} from "../../shared/protocols/index.js";

export class Controller implements IController {
  private readonly wssCommands: WssCommandMap = {
    [WSS_TYPES.USER_LOGIN]: this.handleUserLogin.bind(this),
    [WSS_TYPES.ADMIN_LOGIN]: this.handleAdminLogin.bind(this),
    [WSS_TYPES.USER_LOGOUT]: this.handleUserLogout.bind(this),
  };
  constructor(
    private audioController: IAudioController,
    private networkController: INetworkController,
    private dataController: IDataController,
    private logger: ILogger
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
      onHttpUserLoginRequest: (s, l) => this.handleHttpUserLoginRequest(s, l),
      onWssMessage: this.handleWssMessage.bind(this),
    });
  }

  //Client first makes Http request for a 'soft' login
  //If there is a valid sessionToken, success
  //If no valid sessionToken, but credentials are valid, success and a sessionToken is sent
  //No user is connected to audio matrix yet!
  private async handleHttpUserLoginRequest(
    sessionToken: string | null,
    loginCredentials: LoginCredentials
  ): Promise<AuthResult> {
    const result: AuthResult = await this.dataController.softLoginUser(
      sessionToken,
      loginCredentials
    );
    //If a loginTakeover has taken place (meaning a client has been logged out to allow the new client to connect), disconnect the logged out client
    if (result.loginTakeover && result.userId !== null) {
      this.audioController.disconnectUser(result.userId);
    }
    return result;
  }

  private handleWssMessage<K extends WssType>({
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

  //Handle Wss messages:

  //Proven the theory, still need the proper logic
  //User requests 'hard' login via WS. The sessionToken is used for validation here.
  async handleUserLogin(
    { myNumber }: WssPayloads[typeof WSS_TYPES.USER_LOGIN],
    clientId: string,
    sessionToken: string | null
  ): Promise<void> {
    this.logger.info(
      `Handling user login for clientId ${clientId}, with myNumber being ${myNumber}, and a sessionToken of ${sessionToken}`
    );
    // const result: AuthResult = await this.dataController.loginUser(
    //   sessionToken,
    //   clientId
    // );
    // if (result.success && result.userId !== null) {
    //   this.audioController.connectUser(result.userId, clientId);
    // }
    // this.dataController.sendLoginResponse(result, clientId);
  }

  //Proven the theory, still need the proper logic
  handleAdminLogin(
    { myString }: WssPayloads[typeof WSS_TYPES.ADMIN_LOGIN],
    clientId: string
  ) {
    this.logger.info(`myString is ${myString}, and clientId ${clientId}`);
  }

  //Proven the theory, still need the proper logic
  handleUserLogout(
    { myBoolean }: WssPayloads[typeof WSS_TYPES.USER_LOGOUT],
    clientId: string
  ) {
    this.logger.info(`myBoolean is ${myBoolean}, and clientId ${clientId}`);
  }
}
