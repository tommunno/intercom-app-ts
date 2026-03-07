//Types:
import { dataIsType } from "../../shared/helpers.js";
import type {
  AdminAuthResult,
  AdminUsersChangeRequest,
  AuthResult,
  HeartbeatRequestPayload,
  LoginCredentials,
  UserInfo,
} from "../../shared/types/index.js";
import type {
  AdminLogoutResult,
  AdminUsersChangeRequestResult,
  DataAdminInfos,
  DataHandlers,
  IAccountManager,
  IAdminAccountManager,
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
    private adminAccountManager: IAdminAccountManager,
    private dataManager: IDataManager,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "DataController" });
  }

  init(): void {
    this.bindListeners();
    this.dataManager.init();
    this.accountManager.init();
    this.adminAccountManager.init();
  }

  private async populate(): Promise<void> {
    this.accountManager.populate(this.dataManager.getAccountData());
    await this.adminAccountManager.populate(
      this.dataManager.getAdminAccountData(),
    );
  }

  async start(): Promise<void> {
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.dataManager.start();
    await this.populate();
    this.accountManager.start();
    this.adminAccountManager.start();
    //Test data:
    // this.accountManager.updateUsers([
    //   { userId: 0, password: "tom123" },
    //   { userId: 1, password: "ben123" },
    //   { userId: 2, username: "mark", password: "mark123" },
    // ]);
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

  //DataManager:
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

  //AccountManager:

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

  getLoggedInUserClientIds(): string[] {
    return this.accountManager.getLoggedInUserClientIds();
  }

  processHeartbeatResponse(timestamp: number, clientId: string): void {
    this.accountManager.processHeartbeatResponse(timestamp, clientId);
  }

  //AdminAccountManager:

  softLoginAdmin(
    sessionToken: string | null,
    logCred: LoginCredentials,
  ): Promise<AdminAuthResult> {
    return this.adminAccountManager.softLogin(sessionToken, logCred);
  }

  loginAdmin(sessionToken: string | null, clientId: string): AdminAuthResult {
    return this.adminAccountManager.login(sessionToken, clientId);
  }

  logoutAdmin(clientId: string, hardLogout?: boolean): AdminLogoutResult {
    return this.adminAccountManager.logout(clientId, hardLogout);
  }

  processAdminHeartbeatResponse(timestamp: number, clientId: string): void {
    this.adminAccountManager.processHeartbeatResponse(timestamp, clientId);
  }

  isAdminClientIdLoggedIn(clientId: string): boolean {
    return this.adminAccountManager.isClientIdLoggedIn(clientId);
  }

  getLoggedInAdminClientIds(): string[] {
    return this.adminAccountManager.getLoggedInClientIds();
  }

  getAdminInfos(): DataAdminInfos {
    const usersInfo = this.accountManager.getAdminUsersInfo();
    return { usersInfo };
  }

  processAdminUsersChangeRequest(
    changeRequest: AdminUsersChangeRequest,
  ): Promise<AdminUsersChangeRequestResult> {
    return this.accountManager.processAdminUsersChangeRequest(changeRequest);
  }

  private bindListeners(): void {
    this.dataManager.setHandlers({});

    this.accountManager.setHandlers({
      onHeartbeat: (c, p) => this.handleAccountHeartbeat(c, p),
      onStaleHeartbeat: (c) => this.handleStaleHeartbeat(c),
    });

    this.adminAccountManager.setHandlers({
      onHeartbeat: (c, p) => this.handleAdminAccountHeartbeat(c, p),
      onStaleHeartbeat: (c) => this.handleAdminStaleHeartbeat(c),
    });
  }

  //Handle Account:
  private handleAccountHeartbeat(
    clientIds: string[],
    payload: HeartbeatRequestPayload,
  ): void {
    this.activeHandlers.onAccountHeartbeat(clientIds, payload);
  }

  private handleStaleHeartbeat(clientId: string): void {
    this.activeHandlers.onStaleHeartbeat(clientId);
  }

  //Handle Admin Account:
  private handleAdminAccountHeartbeat(
    clientIds: string[],
    payload: HeartbeatRequestPayload,
  ): void {
    this.activeHandlers.onAccountHeartbeat(clientIds, payload, true);
  }

  private handleAdminStaleHeartbeat(clientId: string): void {
    this.activeHandlers.onStaleHeartbeat(clientId, true);
  }
}
