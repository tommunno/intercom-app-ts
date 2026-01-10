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

  init() {}

  start() {}

  async softLoginUser(
    sessionToken: string | null,
    loginCredentials: LoginCredentials
  ): Promise<AuthResult> {
    return {
      success: true,
      message: "Test message in softLoginUser",
      userUid: 23,
    };
  }

  async loginUser(
    sessionToken: string,
    clientUid: string
  ): Promise<AuthResult> {
    return {
      success: true,
      message: "Test message in loginUser",
      userUid: 27,
    };
  }
}
