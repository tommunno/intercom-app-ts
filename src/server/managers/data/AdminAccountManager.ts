//Types:
import type {
  AdminAuthResult,
  LoginCredentials,
  ManagerStatus,
  SessionTokenInfo,
} from "../../../shared/types/index.js";
import type {
  AdminAccountHandlers,
  IAdminAccountManager,
} from "../../contracts/data/IAdminAccountManager.js";
import type { ILogger } from "../../contracts/index.js";
import type {
  AdminAccountData,
  AuthenticateWithTokenParams,
} from "../../types/index.js";
//Helpers:
import {
  generateSessionToken,
  hasSessionTokenInfoExpired,
  sanitiseSessionTokenInfos,
} from "../../serverHelpers.js";
//Constants:
import { MAX_USERNAME_LENGTH } from "../../../shared/constants/sharedConstants.js";
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  SALT_ROUNDS,
  SESSION_DURATION_MS,
} from "../../constants/serverConstants.js";
//External Libraries:
import bcrypt from "bcrypt";

export class AdminAccountManager implements IAdminAccountManager {
  private status: ManagerStatus = "IDLE";
  private handlers: AdminAccountHandlers | null = null;
  private username: string = DEFAULT_ADMIN_USERNAME;
  private passwordHash: string | null = null;
  //<sessionToken, sessionTokenInfo>:
  private sessionTokenInfos: Map<string, SessionTokenInfo> = new Map();
  //<clientId, sessionToken>:
  private loggedInClientIds: Map<string, string> = new Map();

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "AdminAccountManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the AdminAccountManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  async populate(data: AdminAccountData): Promise<void> {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the AdminAccountManager whilst its status is ${this.status}`,
      );
    }
    await this.setCredentials(data.username, data.passwordHash);
    this.setSessionTokenInfos(data.sessionTokenInfos);
    this.status = "POPULATED";
  }

  start(): void {
    if (this.status !== "POPULATED") {
      throw new Error(
        `Cannot start the AdminAccountManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.status = "RUNNING";
  }

  //Still need to implement:
  stop(): void {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Cannot stop the AdminAccountManager whilst its status is ${this.status}`,
      );
      return;
    }
    this.status = "IDLE";
  }

  login(sessionToken: string | null, clientId: string): AdminAuthResult {
    const result = this.checkAndWarnIfNotRunning("login admin");
    if (result) return result;

    return this.authenticateWithToken({
      sessionToken,
      softLogin: false,
      clientId,
    });
  }

  async softLogin(
    sessionToken: string | null,
    logCred: LoginCredentials,
  ): Promise<AdminAuthResult> {
    const result = this.checkAndWarnIfNotRunning("soft login admin");
    if (result) return result;

    //If a username or password has been provided, use these credentials instead of the existing sessionToken, and issue a new sessionToken if authenticated
    if (logCred.username !== null || logCred.password !== null) {
      return this.authenticateWithCredentials(logCred);
    }
    //Otherwise, we try to use the existing sessionToken to authenticate:
    return this.authenticateWithToken({
      sessionToken,
      softLogin: true,
    });
  }

  private hardLogin(clientId: string, sessionToken: string): AdminAuthResult {
    this.loggedInClientIds.set(clientId, sessionToken);

    return {
      success: true,
      message: "Admin logged in",
      statusCode: 200,
      newSessionToken: null,
    };
  }

  private async authenticateWithCredentials({
    username,
    password,
  }: LoginCredentials): Promise<AdminAuthResult> {
    const baseResult: AdminAuthResult = {
      success: false,
      message: "",
      statusCode: 401,
    };

    if (username === null || password === null) {
      return { ...baseResult, message: "Missing credentials", statusCode: 400 };
    }

    if (username !== this.username) {
      return { ...baseResult, message: "Incorrect username or password" };
    }

    if (this.passwordHash === null) {
      return { ...baseResult, message: "Incorrect username or password" };
    }

    const passwordMatch = await bcrypt.compare(password, this.passwordHash);
    if (!passwordMatch) {
      return { ...baseResult, message: "Incorrect username or password" };
    }

    //We now have valid credentials. A new sessionToken will be handed out. But the client will not be logged in until it is 'hard' logged in via WS!
    const newSessionToken = generateSessionToken();
    this.addUniqueSessionToken(newSessionToken);

    return {
      success: true,
      message: "Login approved with credentials",
      statusCode: 200,
      newSessionToken,
    };
  }

  private authenticateWithToken(
    params: AuthenticateWithTokenParams,
  ): AdminAuthResult {
    const { softLogin, sessionToken } = params;

    const baseResult: AdminAuthResult = {
      success: false,
      message: "",
      statusCode: 400,
    };

    if (sessionToken === null) {
      return {
        ...baseResult,
        message: "No credentials or session token provided",
      };
    }

    const sessionTokenInfo = this.sessionTokenInfos.get(sessionToken);

    if (!sessionTokenInfo) {
      return {
        ...baseResult,
        message: "Invalid session token",
        statusCode: 401,
      };
    }

    if (hasSessionTokenInfoExpired(sessionTokenInfo)) {
      return {
        ...baseResult,
        message: "Invalid session token",
        statusCode: 401,
      };
    }

    //We are now able to login:
    if (!softLogin) {
      return this.hardLogin(params.clientId, sessionToken);
    }
    //Soft login:
    return {
      success: true,
      message: "Login approved with session token",
      statusCode: 200,
      newSessionToken: null,
    };
  }

  setHandlers(handlers: AdminAccountHandlers): void {
    this.handlers = handlers;
  }

  private async setCredentials(
    username: string | undefined,
    passwordHash: string | undefined,
  ): Promise<void> {
    if (username !== undefined) {
      if (!this.validateUsername(username)) {
        this.logger.warn(
          `Invalid admin username loaded. Will use the default admin username of ${DEFAULT_ADMIN_USERNAME}`,
        );
      } else {
        this.username = username;
      }
    }
    if (passwordHash !== undefined) {
      this.passwordHash = passwordHash;
      return;
    }
    this.logger.warn(
      "No admin password detected. Falling back to the default. Action recommended: Update the admin password soon to keep things secure",
    );
    this.passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, SALT_ROUNDS);
  }

  private setSessionTokenInfos(sessionTokenInfos?: SessionTokenInfo[]): void {
    if (sessionTokenInfos) {
      const sessionTokenInfosArr = sanitiseSessionTokenInfos(
        sessionTokenInfos,
        this.logger,
      );
      this.sessionTokenInfos = new Map();
      sessionTokenInfosArr.forEach((sT) => {
        this.sessionTokenInfos.set(sT.token, sT);
      });
    }
  }

  private addUniqueSessionToken(token: string): SessionTokenInfo {
    const found = this.sessionTokenInfos.get(token);
    if (found) {
      // Invariant: tokens should be unique and a freshly issued token shouldn't already exist
      // If this happens, normalise by extending to the full session duration
      this.logger.warn(
        `Session token already existed for admin; normalising expiry`,
      );
      found.expiresAtMs = Date.now() + SESSION_DURATION_MS;
      return found;
    }

    const sessionTokenInfo = {
      token,
      expiresAtMs: Date.now() + SESSION_DURATION_MS,
    };
    this.sessionTokenInfos.set(token, sessionTokenInfo);
    return sessionTokenInfo;
  }

  private validateUsername(name: string): boolean {
    return name.length !== 0 && name.length <= MAX_USERNAME_LENGTH;
  }

  private get activeHandlers(): AdminAccountHandlers {
    if (!this.handlers)
      throw new Error("AdminAccountManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): AdminAuthResult | null {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this.status}`,
      );
      return {
        success: false,
        message: "Internal server error: AdminAccountManager not running",
        statusCode: 500,
      };
    }
    return null;
  }
}
