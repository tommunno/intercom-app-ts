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

export class DataController implements IDataController {
  private handlers: DataHandlers | null = null;

  constructor(
    private accountManager: IAccountManager,
    private dataManager: IDataManager,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "DataController" });
  }

  init() {
    this.bindListeners();
    //Test data:
    this.accountManager.init({
      numUsers: 3,
      loadedUsers: [
        {
          id: 0,
          loggedIn: false,
          username: "tom",
          password: null,
          clientId: null,
          sessionTokenInUse: null,
          sessionTokens: ["afjodij", "jafodisjoidfj"],
          lastHeartbeatResponse: null,
        },
        {
          id: 1,
          loggedIn: false,
          username: "ben",
          password: null,
          clientId: null,
          sessionTokenInUse: null,
          sessionTokens: ["fadf", "jafodisjfadsdf"],
          lastHeartbeatResponse: null,
        },
        {
          id: 2,
          loggedIn: false,
          username: "mark",
          password: null,
          clientId: null,
          sessionTokenInUse: null,
          sessionTokens: ["dd", "fss"],
          lastHeartbeatResponse: null,
        },
      ],
    });
    //End test data
  }

  start() {
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;
    this.accountManager.start();
    //Test:
    this.accountManager.updateUsers([
      {
        id: 0,
        username: "tom",
        password: "tom123",
      },
      {
        id: 1,
        username: "ben",
        password: "ben123",
      },
      {
        id: 2,
        username: "mark",
        password: "mark123",
      },
    ]);
    //End test
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

  private bindListeners(): void {
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
}
