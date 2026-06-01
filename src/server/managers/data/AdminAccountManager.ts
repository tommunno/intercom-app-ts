//Types:
import type {
  AdminAuthResult,
  LoginCredentials,
  ManagerStatus,
  SessionTokenInfo,
} from "../../../shared/types/index.js";
import type {
  AdminAccountHandlers,
  AdminLogoutResult,
  IAdminAccountManager,
} from "../../contracts/data/IAdminAccountManager.js";
import type { ILogger } from "../../contracts/index.js";
import type {
  AdminAccountData,
  AdminLoggedInClientInfo,
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
  ACCOUNT_HEARTBEAT_DURATION_MS,
  ACCOUNT_STALE_HEARTBEAT_MS,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  SALT_ROUNDS,
  SESSION_CLEANUP_INTERVAL_MS,
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
  //<clientId, AdminLoggedInClientInfo>:
  private loggedInClients: Map<string, AdminLoggedInClientInfo> = new Map();
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private sessionCleanupIntervalId: ReturnType<typeof setInterval> | null =
    null;

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
    this.startHeartbeat();
    this.startSessionCleanup();
    this.status = "RUNNING";
  }

  stop(): void {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Cannot stop the AdminAccountManager whilst its status is ${this.status}`,
      );
      return;
    }
    this.username = DEFAULT_ADMIN_USERNAME;
    this.passwordHash = null;
    this.sessionTokenInfos.clear();
    this.loggedInClients.clear();
    this.stopHeartbeat();
    this.stopSessionCleanup();
    this.status = "IDLE";
  }

  setHandlers(handlers: AdminAccountHandlers): void {
    this.handlers = handlers;
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

  login(sessionToken: string | null, clientId: string): AdminAuthResult {
    const result = this.checkAndWarnIfNotRunning("login admin");
    if (result) return result;

    return this.authenticateWithToken({
      sessionToken,
      softLogin: false,
      clientId,
    });
  }

  //Returns success if the client requesting logout successfully logs out
  logout(clientId: string, hardLogout: boolean = false): AdminLogoutResult {
    const loggedInClientInfo = this.loggedInClients.get(clientId);
    if (!loggedInClientInfo) {
      this.logger.error(
        `logout: Unable to logout clientId ${clientId}: the admin is not logged in`,
      );
      return { success: false, otherLoggedOutClientIds: [] };
    }
    let success = this.loggedInClients.delete(clientId);

    if (!success) {
      this.logger.error(`logout: Unable to delete clientId ${clientId}`);
    }

    if (!hardLogout) {
      if (success) {
        this.logger.success(`Soft logged out admin ${clientId}`);
      }
      return { success, otherLoggedOutClientIds: [] };
    }
    //Hard logout:

    success = this.sessionTokenInfos.delete(loggedInClientInfo.sessionToken);
    if (!success) {
      this.logger.error(
        `logout: Unable to delete sessionTokenInfo for clientId ${clientId}`,
      );
    }

    const otherLoggedOutClientIds: string[] = [];
    this.loggedInClients.forEach((info, clientId) => {
      if (info.sessionToken === loggedInClientInfo.sessionToken) {
        otherLoggedOutClientIds.push(clientId);
      }
    });
    otherLoggedOutClientIds.forEach((clientId) => {
      if (!this.loggedInClients.delete(clientId)) {
        this.logger.error(
          `logout: Unable to delete otherLoggedOutClientIds clientId ${clientId}`,
        );
      }
    });

    if (success) {
      this.logger.success(`Hard logged out admin ${clientId}`);
    }
    return { success, otherLoggedOutClientIds };
  }

  processHeartbeatResponse(timestamp: number, clientId: string): void {
    const notRunning = this.checkAndWarnIfNotRunning(
      "process heartbeat response",
    );
    if (notRunning) return;

    const loggedInClientInfo = this.loggedInClients.get(clientId);
    if (!loggedInClientInfo) return;

    loggedInClientInfo.lastHeartbeatResponse = Date.now();
  }

  isClientIdLoggedIn(clientId: string): boolean {
    return this.loggedInClients.has(clientId);
  }

  getLoggedInClientIds(): string[] {
    return Array.from(this.loggedInClients.keys());
  }

  getSaveSnapshot(): AdminAccountData | null {
    const notRunning = this.checkAndWarnIfNotRunning("get save snapshot");
    if (notRunning) return null;

    const sessionTokenInfos: SessionTokenInfo[] = [];
    this.sessionTokenInfos.forEach((info) => {
      sessionTokenInfos.push({ ...info });
    });

    if (this.passwordHash === null) {
      return {
        username: this.username,
        sessionTokenInfos,
      };
    }
    return {
      username: this.username,
      passwordHash: this.passwordHash,
      sessionTokenInfos,
    };
  }

  private hardLogin(clientId: string, sessionToken: string): AdminAuthResult {
    this.loggedInClients.set(clientId, {
      clientId,
      sessionToken,
      lastHeartbeatResponse: null,
    });

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

  private startHeartbeat(): void {
    if (this.heartbeatIntervalId !== null) {
      clearInterval(this.heartbeatIntervalId);
    }
    this.heartbeatIntervalId = setInterval(
      () => this.sendHeartbeat(),
      ACCOUNT_HEARTBEAT_DURATION_MS,
    );
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId !== null) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private sendHeartbeat(): void {
    const clientIds: string[] = [];
    const timestamp = Date.now();

    this.loggedInClients.forEach((info) => {
      clientIds.push(info.clientId);
      const lastResponseAt = info.lastHeartbeatResponse;
      if (lastResponseAt === null) return;

      const endTime = Date.now();
      const timeElapsed = endTime - lastResponseAt;

      if (timeElapsed > ACCOUNT_STALE_HEARTBEAT_MS) {
        this.activeHandlers.onStaleHeartbeat(info.clientId);
      }
    });

    this.activeHandlers.onHeartbeat(clientIds, { timestamp });
  }

  private getValidSessionTokenInfos(
    sessionTokenInfos: Map<string, SessionTokenInfo>,
  ): Map<string, SessionTokenInfo> {
    const now = Date.now();
    const newSessionTokenInfos = new Map<string, SessionTokenInfo>();
    sessionTokenInfos.forEach((info, sT) => {
      if (!hasSessionTokenInfoExpired(info, now)) {
        newSessionTokenInfos.set(sT, info);
      }
    });
    return newSessionTokenInfos;
  }

  private startSessionCleanup(): void {
    if (this.sessionCleanupIntervalId !== null) {
      clearInterval(this.sessionCleanupIntervalId);
    }
    this.sessionCleanupIntervalId = setInterval(
      () => this.cleanupSessions(),
      SESSION_CLEANUP_INTERVAL_MS,
    );
  }

  private stopSessionCleanup(): void {
    if (this.sessionCleanupIntervalId === null) return;
    clearInterval(this.sessionCleanupIntervalId);
    this.sessionCleanupIntervalId = null;
  }

  private cleanupSessions(): void {
    this.logger.info("Cleaning up sessions");
    const beforeSize = this.sessionTokenInfos.size;

    this.sessionTokenInfos = this.getValidSessionTokenInfos(
      this.sessionTokenInfos,
    );
    if (beforeSize !== this.sessionTokenInfos.size) {
      this.activeHandlers.onSessionTokensCleanedUp();
    }
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
