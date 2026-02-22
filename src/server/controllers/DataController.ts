//Types:
import { dataIsType } from "../../shared/helpers.js";
import type {
  AuthResult,
  HeartbeatRequestPayload,
  LoginCredentials,
  UserInfo,
} from "../../shared/types/index.js";

import type {
  DataHandlers,
  IAccountManager,
  IDataController,
  IDataManager,
  ILogger,
} from "../contracts/index.js";
//Constants:
import type { NetworkData } from "../types/NetworkData.js";
import type { AudioData, AudioPopulateData } from "../types/index.js";

export class DataController implements IDataController {
  private handlers: DataHandlers | null = null;

  constructor(
    private accountManager: IAccountManager,
    private dataManager: IDataManager,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "DataController" });
  }

  init(): void {
    this.bindListeners();
    this.dataManager.init();
    this.accountManager.init();
  }

  private populate(): void {
    this.accountManager.populate(this.dataManager.getAccountData());
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.dataManager.start();
    this.populate();
    this.accountManager.start();
    //Test data:
    this.accountManager.updateUsers([
      { userId: 0, password: "tom123" },
      { userId: 1, password: "ben123" },
      { userId: 2, username: "mark", password: "mark123" },
    ]);
    //End test data
  }

  setHandlers(handlers: DataHandlers): void {
    this.handlers = handlers;
  }

  private get activeHandlers(): DataHandlers {
    if (!this.handlers)
      throw new Error("DataController handlers not initialized!");
    return this.handlers;
  }

  softLoginUser(
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ): Promise<AuthResult> {
    return this.accountManager.softLoginUser(sessionToken, loginCredentials);
  }

  loginUser(sessionToken: string | null, clientId: string): AuthResult {
    return this.accountManager.loginUser(sessionToken, clientId);
  }

  logoutUser(id: number | string, hardLogout: boolean = false): number | null {
    if (dataIsType("number", id))
      //Narrowed to userId for function overload
      return this.accountManager.logoutUser(id, hardLogout);
    //Narrowed to clientId for function overload
    return this.accountManager.logoutUser(id, hardLogout);
  }

  isClientIdLoggedIn(clientId: string): number | null {
    return this.accountManager.isClientIdLoggedIn(clientId);
  }

  isUserIdLoggedIn(userId: number): string | null {
    return this.accountManager.isUserIdLoggedIn(userId);
  }

  getUserInfo(userId: number): UserInfo | null {
    return this.accountManager.getUserInfo(userId);
  }

  processHeartbeatResponse(timestamp: number, clientId: string): void {
    this.accountManager.processHeartbeatResponse(timestamp, clientId);
  }

  getLoggedInUserClientIds(): string[] {
    return this.accountManager.getLoggedInUserClientIds();
  }

  private bindListeners(): void {
    this.dataManager.setHandlers({});

    this.accountManager.setHandlers({
      onHeartbeat: (c, p) => this.handleAccountHeartbeat(c, p),
      onStaleHeartbeat: (c) => this.handleStaleHeartbeat(c),
    });
  }

  //Handle Account:
  handleAccountHeartbeat(
    clientIds: string[],
    payload: HeartbeatRequestPayload,
  ): void {
    this.activeHandlers.onAccountHeartbeat(clientIds, payload);
  }

  handleStaleHeartbeat(clientId: string): void {
    this.activeHandlers.onStaleHeartbeat(clientId);
  }

  //Handle Data:

  getNetworkData(): NetworkData {
    return this.dataManager.getNetworkData();
  }

  getAudioData(): AudioPopulateData {
    const audioData: AudioData = this.dataManager.getAudioData();
    return {
      ...audioData,
      numUsers: this.accountManager.numUsers,
    };
  }
}
