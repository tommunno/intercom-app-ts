import type {
  IAudioController,
  IController,
  IDataController,
  ILogger,
  INetworkController,
} from "../contracts/index.js";
import type { AuthResult, LoginCredentials } from "../../shared/types/index.js";

export class Controller implements IController {
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
      onWsUserLoginRequest: (s, c) => this.handleWsUserLoginRequest(s, c),
    });
  }

  //Client first makes Http request
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
    if (result.loginTakeover && result.userId !== null)
      this.audioController.disconnectUser(result.userId);
    return result;
  }

  //Client can then try to connect via Ws
  //If sessionToken is valid, success
  //User is then connected to the audioMatrix
  private async handleWsUserLoginRequest(
    sessionToken: string,
    clientUid: string
  ): Promise<AuthResult> {
    const result: AuthResult = await this.dataController.loginUser(
      sessionToken,
      clientUid
    );
    if (result.success && result.userId !== null && result.clientId !== null) {
      this.audioController.connectUser(result.userId, result.clientId);
    }
    return result;
  }
}
