import type { AuthResult, LoginCredentials } from "../../shared/types/index.js";
import type {
  IAccountManager,
  IDataController,
  IDataManager,
  ILogger,
} from "../contracts/index.js";

export class DataController implements IDataController {
  constructor(
    private accountManager: IAccountManager,
    private dataManager: IDataManager,
    private logger: ILogger
  ) {
    this.logger = this.logger.child({ context: "DataController" });
  }

  init() {
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
        },
        {
          id: 1,
          loggedIn: false,
          username: "ben",
          password: null,
          clientId: null,
          sessionTokenInUse: null,
          sessionTokens: ["fadf", "jafodisjfadsdf"],
        },
        {
          id: 2,
          loggedIn: false,
          username: "mark",
          password: null,
          clientId: null,
          sessionTokenInUse: null,
          sessionTokens: ["dd", "fss"],
        },
      ],
    });
    //End test data
  }

  start() {
    this.accountManager.start();
    //Test:
    this.accountManager.updateUsers([
      {
        id: 0,
        username: "TOM",
        password: null,
      },
      {
        id: 1,
        username: "BEN",
        password: "ben123",
      },
      {
        id: 2,
        username: "MARK",
        password: null,
      },
    ]);
    //End test
  }

  softLoginUser(
    sessionToken: string | null,
    loginCredentials: LoginCredentials
  ): Promise<AuthResult> {
    return this.accountManager.softLoginUser(sessionToken, loginCredentials);
  }

  async loginUser(
    sessionToken: string,
    clientUid: string
  ): Promise<AuthResult> {
    //Test
    return {
      success: true,
      message: "Test message in loginUser",
      statusCode: 200,
      userId: null,
      newSessionToken: null,
      loginTakeover: false,
      clientId: null,
    };
    //End test
  }
}
