//Client/Server shared Types:
import {
  type LoginCredentials,
  type User,
  type ManagerStatus,
  type AuthResult,
  type UserInfo,
  type SessionTokenInfo,
  type AdminUserUpdate,
  type UserAndId,
} from "../../../shared/types/index.js";
//Server Types:

//Contracts:
import {
  type AccountHandlers,
  type HardLoginUserParams,
  type IAccountManager,
  type ILogger,
} from "../../contracts/index.js";
//Constants:
import {
  ACCOUNT_HEARTBEAT_DURATION_MS,
  ACCOUNT_STALE_HEARTBEAT_MS,
  DEFAULT_NUM_USERS,
  MAX_NUM_USERS,
  SALT_ROUNDS,
  SESSION_CLEANUP_INTERVAL_MS,
  SESSION_DURATION_MS,
} from "../../constants/serverConstants.js";
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../../../shared/constants/sharedConstants.js";
//External Libraries:
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { dataIsType } from "../../../shared/helpers.js";
import type { AccountData, PersistedUsers } from "../../types/AccountData.js";

export class AccountManager implements IAccountManager {
  private status: ManagerStatus = "IDLE";
  private handlers: AccountHandlers | null = null;
  private _numUsers: number = DEFAULT_NUM_USERS;
  private users: Map<number, User> = new Map();
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private sessionCleanupIntervalId: ReturnType<typeof setInterval> | null =
    null;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "AccountManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the AccountManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  populate(data: AccountData): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the AccountManager whilst its status is ${this.status}`,
      );
    }
    this.setNumUsers(data.numUsers);
    this.populateUsers(data.persistedUsers);
    this.status = "POPULATED";
  }

  start(): void {
    if (this.status !== "POPULATED") {
      throw new Error(
        `Cannot start the AccountManager whilst its status is ${this.status}`,
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
        `Cannot stop the AccountManager whilst its status is ${this.status}`,
      );
      return;
    }
    this._numUsers = DEFAULT_NUM_USERS;
    this.users.clear();
    this.stopHeartbeat();
    this.stopSessionCleanup();
    this.status = "IDLE";
  }

  setHandlers(handlers: AccountHandlers): void {
    this.handlers = handlers;
  }

  private get activeHandlers(): AccountHandlers {
    if (!this.handlers)
      throw new Error("AccountManager handlers not initialized!");
    return this.handlers;
  }

  private setNumUsers(numUsers?: number): void {
    if (
      !dataIsType("safeIntegerNum", numUsers) ||
      numUsers < 1 ||
      numUsers > MAX_NUM_USERS
    ) {
      this.logger.warn(
        `numUsers is invalid. Will fall back to the default value of ${DEFAULT_NUM_USERS}`,
      );
      this._numUsers = DEFAULT_NUM_USERS;
    } else {
      this._numUsers = numUsers;
    }
  }

  private populateUsers(pUsers?: PersistedUsers): void {
    if (!pUsers) {
      this.logger.warn(
        `No users found in loaded data. Will create new empty users instead`,
      );
      this.createEmptyUsers();
      return;
    }

    this.users.clear();
    const usernames = new Set<string>();

    for (let i = 0; i < this._numUsers; i++) {
      const newUser = this.returnUniqueEmptyUser(i, usernames);
      const pUser = pUsers[i];
      if (!pUser) {
        this.logger.warn(
          `No user found at userId ${i} in loaded data. Will create a new empty user instead`,
        );
        this.users.set(i, newUser);
        usernames.add(newUser.username);
        continue;
      }
      const { passwordHash: p, sessionTokenInfos: sTs } = pUser;
      const u = pUser.username.trim();

      if (!this.validateUsername({ name: u, usernames })) {
        this.logger.warn(
          `Username invalid in loaded data for userId ${i}. Will set the username to ${newUser.username} instead`,
        );
      } else {
        newUser.username = u;
      }
      newUser.passwordHash = p;
      newUser.sessionTokenInfos = this.sanitiseSessionTokenInfos(sTs, i);

      this.users.set(i, newUser);
      usernames.add(newUser.username);
    }
  }

  // If name === currentName, we treat it as valid even though it exists in the usernames set
  private validateUsername({
    name,
    usernames,
    currentName,
  }: {
    name: string;
    usernames?: Set<string>;
    currentName?: string;
  }): boolean {
    if (currentName && name === currentName) return true;

    if (!usernames) {
      usernames = new Set<string>(
        Array.from(this.users.values()).map((u) => u.username),
      );
    }
    return (
      !usernames.has(name) &&
      name.length !== 0 &&
      name.length <= MAX_USERNAME_LENGTH
    );
  }

  private validatePassword(password: string): boolean {
    return (
      password.length >= MIN_PASSWORD_LENGTH &&
      password.length <= MAX_PASSWORD_LENGTH
    );
  }

  private sanitiseSessionTokenInfos(
    infos: SessionTokenInfo[],
    userId: number,
  ): SessionTokenInfo[] {
    const result: SessionTokenInfo[] = [];
    const seen = new Set<string>();
    let duplicateToken = false;

    for (const info of infos) {
      if (this.sessionTokenInfoHasExpired(info)) continue;

      if (seen.has(info.token)) {
        duplicateToken = true;
        continue;
      }

      seen.add(info.token);
      result.push({ ...info });
    }

    if (duplicateToken) {
      this.logger.warn(
        `Duplicate sessionToken found in loaded sessionTokenInfos for userId ${userId}`,
      );
    }
    return result;
  }

  //Ensures a unique default username is provisioned by checking for collisions against the usernames Set
  private createUniqueDefaultUsername(
    id: number,
    usernames: Set<string>,
  ): string {
    const base = `user-${id}`;

    if (!usernames.has(base)) return base;

    // Collision fallback:
    while (true) {
      const suffix = crypto.randomUUID().slice(0, 4);
      const candidate = `${base}-${suffix}`;
      if (!usernames.has(candidate)) return candidate;
    }
  }

  private returnUniqueEmptyUser(id: number, usernames: Set<string>): User {
    return {
      username: this.createUniqueDefaultUsername(id, usernames),
      passwordHash: null,
      sessionTokenInfos: [],
      loggedIn: false,
      clientId: null,
      sessionTokenInfoInUse: null,
      lastHeartbeatResponse: null,
    };
  }

  private createEmptyUsers(): void {
    const usernames = new Set<string>();
    this.users.clear();

    for (let i = 0; i < this._numUsers; i++) {
      const newUser = this.returnUniqueEmptyUser(i, usernames);
      this.users.set(i, newUser);
      usernames.add(newUser.username);
    }
  }

  private findUserAndIdByUsername(name: string): UserAndId | null {
    for (const [userId, user] of this.users.entries()) {
      if (user.username === name) {
        return [user, userId];
      }
    }
    return null;
  }

  private findUserAndIdByClientId(clientId: string): UserAndId | null {
    for (const [userId, user] of this.users.entries()) {
      if (user.clientId === clientId) {
        return [user, userId];
      }
    }
    return null;
  }

  private findSessionContextByToken(
    sessionToken: string,
  ): { user: User; userId: number; sessionTokenInfo: SessionTokenInfo } | null {
    for (const [userId, user] of this.users.entries()) {
      const sessionTokenInfo = user.sessionTokenInfos.find(
        (i) => i.token === sessionToken,
      );
      if (sessionTokenInfo) {
        return { user, userId, sessionTokenInfo };
      }
    }
    return null;
  }

  private async authenticateUserWithCredentials({
    username,
    password,
  }: LoginCredentials): Promise<AuthResult> {
    const baseResult: AuthResult = {
      success: false,
      message: "",
      statusCode: 401,
    };

    if (username === null || password === null) {
      return { ...baseResult, message: "Missing credentials", statusCode: 400 };
    }

    const result = this.findUserAndIdByUsername(username);
    //If no found user, or if the password for the found user hasn't been set yet
    if (!result) {
      return { ...baseResult, message: "Incorrect username or password" };
    }
    const [user, userId] = result;
    if (user.passwordHash === null) {
      return { ...baseResult, message: "Incorrect username or password" };
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return { ...baseResult, message: "Incorrect username or password" };
    }

    //We now have valid credentials
    //If the user is already logged in, we don't allow a login
    if (user.loggedIn) {
      return {
        ...baseResult,
        message: "User already logged in",
        statusCode: 409,
      };
    }

    //User is not logged in, and credentials match. Client has been succesfully authenticated, and a new sessionToken will be handed out. But the client will not be logged in until it is 'hard' logged in via WS!
    const newSessionToken = this.generateSessionToken();
    this.addUniqueSessionToken(user, newSessionToken);

    return {
      ...baseResult,
      success: true,
      message: "Login approved with credentials",
      statusCode: 200,
      userId,
      newSessionToken,
      loginTakeover: false,
    };
  }

  private authenticateUserWithToken({
    sessionToken,
    softLogin,
    clientId,
  }: {
    sessionToken: string | null;
    softLogin: boolean;
    clientId: string | null;
  }): AuthResult {
    const baseResult: AuthResult = {
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

    const sessionContext = this.findSessionContextByToken(sessionToken);

    if (!sessionContext) {
      return {
        ...baseResult,
        message: "Invalid session token",
        statusCode: 401,
      };
    }

    const { user, userId, sessionTokenInfo } = sessionContext;

    if (this.sessionTokenInfoHasExpired(sessionTokenInfo)) {
      return {
        ...baseResult,
        message: "Invalid session token",
        statusCode: 401,
      };
    }
    //We have now found a user

    let loginTakeover = false;
    const sessionTokenMatch =
      sessionToken === user.sessionTokenInfoInUse?.token;

    //If the user is already logged in and the client is logging in using a different sessionToken, we don't allow this
    if (user.loggedIn && !sessionTokenMatch) {
      return {
        ...baseResult,
        message: "User already logged in",
        statusCode: 409,
      };
    }
    //If user is logged in and there is a sessionToken match, then we can do a login takeover. This will logout the old client, and hard/soft login the new user
    if (user.loggedIn && sessionTokenMatch) {
      let loggedOutClientId = user.clientId;
      if (loggedOutClientId === null) {
        this.logger.error(
          `authenticateUserWithToken: Invariant violation: User ${userId} is marked as loggedIn but has no clientId`,
        );
        loggedOutClientId = "";
      }
      this.logoutUser([user, userId]);

      //Hard login:
      if (!softLogin) {
        return this.hardLoginUser({
          user,
          userId,
          loginTakeover: true,
          clientId,
          sessionTokenInfo,
          loggedOutClientId,
        });
      }
      //Soft login:
      return {
        ...baseResult,
        success: true,
        message: "Login takeover with session token",
        statusCode: 200,
        userId,
        newSessionToken: null,
        loginTakeover: true,
        loggedOutClientId,
      };
    }
    //foundUser is not logged in. Client has been succesfully authenticated, and will be soft/hard logged in
    //Hard login:
    if (!softLogin) {
      return this.hardLoginUser({
        user,
        userId,
        loginTakeover: false,
        clientId,
        sessionTokenInfo,
      });
    }
    //Soft login:
    return {
      ...baseResult,
      success: true,
      message: "Login approved with session token",
      statusCode: 200,
      userId,
      newSessionToken: null,
      loginTakeover: false,
    };
  }

  private hardLoginUser(params: HardLoginUserParams): AuthResult {
    const { user, userId, loginTakeover, clientId, sessionTokenInfo } = params;

    const baseResult: AuthResult = {
      success: false,
      message: "Unable to login user",
      statusCode: 500,
    };

    if (clientId === null) {
      this.logger.error(`hardLoginUser: No clientId provided`);
      return baseResult;
    }
    if (user.loggedIn) {
      this.logger.error(
        `hardLoginUser: Unable to login user: user ${userId} is already logged in`,
      );
      return baseResult;
    }
    user.loggedIn = true;
    user.clientId = clientId;
    user.sessionTokenInfoInUse = sessionTokenInfo;
    user.lastHeartbeatResponse = null;

    if (loginTakeover) {
      return {
        ...baseResult,
        success: true,
        message: "User logged in",
        statusCode: 200,
        userId,
        newSessionToken: null,
        loginTakeover,
        loggedOutClientId: params.loggedOutClientId,
      };
    }
    return {
      ...baseResult,
      success: true,
      message: "User logged in",
      statusCode: 200,
      userId,
      newSessionToken: null,
      loginTakeover: false,
    };
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

    this.users.forEach((user) => {
      if (!user.loggedIn || !user.clientId) return;
      clientIds.push(user.clientId);
      const lastResponseAt = user.lastHeartbeatResponse;
      if (lastResponseAt === null) return;

      const endTime = Date.now();
      const timeElapsed = endTime - lastResponseAt;

      if (timeElapsed > ACCOUNT_STALE_HEARTBEAT_MS) {
        this.activeHandlers.onStaleHeartbeat(user.clientId);
      }
    });

    this.activeHandlers.onHeartbeat(clientIds, { timestamp });
  }

  private generateSessionToken(): string {
    return crypto.randomUUID();
  }

  //If hardLogout is true, the sessionToken is removed from the sessionTokens array.
  //A userId, a user, or a clientId, should be passed in.
  //Returns the userId if successful, or null if not
  logoutUser(
    data: number | string | UserAndId,
    hardLogout: boolean = false,
  ): number | null {
    const result = this.checkAndWarnIfNotRunning("logout user");
    if (result) return null;

    let userAndId: UserAndId | null = null;
    let errInfo = "";

    if (dataIsType("number", data)) {
      //Data is userId
      const user = this.users.get(data);
      if (user) userAndId = [user, data];
      errInfo = `userId of ${data}`;
    } else if (dataIsType("string", data)) {
      //Data is clientId
      const result = this.findUserAndIdByClientId(data);
      if (result) userAndId = result;
      errInfo = `clientId of ${data}`;
    } else {
      //Data is type UserAndId
      userAndId = data;
    }
    if (!userAndId) {
      this.logger.error(`No user could be found in logoutUser with ${errInfo}`);
      return null;
    }
    const [user, userId] = userAndId;

    user.loggedIn = false;
    user.clientId = null;
    user.lastHeartbeatResponse = null;

    if (hardLogout && user.sessionTokenInfoInUse) {
      const { sessionTokenInfoInUse } = user;
      user.sessionTokenInfos = user.sessionTokenInfos.filter(
        (info) => info.token !== sessionTokenInfoInUse.token,
      );
    }

    user.sessionTokenInfoInUse = null;
    this.logger.info(`Logged out user ${userId}`);
    return userId;
  }

  async softLoginUser(
    sessionToken: string | null,
    logCred: LoginCredentials,
  ): Promise<AuthResult> {
    const result = this.checkAndWarnIfNotRunning("soft login user");
    if (result) return result;
    //If a username or password has been provided, use these credentials instead of the existing sessionToken, and issue a new sessionToken if authenticated
    if (logCred.username !== null || logCred.password !== null) {
      return this.authenticateUserWithCredentials(logCred);
    }
    //Otherwise, we try to use the existing sessionToken to authenticate:
    return this.authenticateUserWithToken({
      sessionToken,
      softLogin: true,
      clientId: null,
    });
  }

  loginUser(sessionToken: string | null, clientId: string): AuthResult {
    const result = this.checkAndWarnIfNotRunning("login user");
    if (result) return result;

    return this.authenticateUserWithToken({
      sessionToken,
      softLogin: false,
      clientId,
    });
  }

  //Returns userId if successful:
  isClientIdLoggedIn(clientId: string): number | null {
    const result = this.checkAndWarnIfNotRunning(
      "check if client ID is logged in",
    );
    if (result) return null;

    for (const [id, user] of this.users.entries()) {
      if (user.loggedIn && user.clientId === clientId) {
        return id;
      }
    }
    return null;
  }

  //Returns clientId if successful:
  isUserIdLoggedIn(userId: number): string | null {
    const result = this.checkAndWarnIfNotRunning(
      "check if user ID is logged in",
    );
    if (result) return null;

    const foundUser = this.users.get(userId);
    if (!foundUser || !foundUser.loggedIn) return null;
    return foundUser.clientId;
  }

  //For eg admins updating info about users. Passwords are expected as plain text here.
  async updateUsers(updates: AdminUserUpdate[]): Promise<void> {
    const result = this.checkAndWarnIfNotRunning("update users");
    if (result) return;

    for (let update of updates) {
      const { userId: id, username: u, password: p } = update;
      if (u === undefined && p === undefined) {
        continue;
      }
      const foundUser = this.users.get(id);
      if (!foundUser) {
        this.logger.warn(`Unable to update user: userId ${id} does not exist`);
        continue;
      }
      if (p !== undefined) {
        if (this.validatePassword(p)) {
          const hash = await bcrypt.hash(p, SALT_ROUNDS);
          foundUser.passwordHash = hash;
        } else {
          this.logger.warn(
            `Unable to update password for userId ${id}. The password is invalid`,
          );
        }
      }
      if (u !== undefined) {
        const trimmedU = u.trim();
        //Rebuild the usernames set each time in validateUsername, because usernames could have changed during the await above:
        if (
          this.validateUsername({
            name: trimmedU,
            currentName: foundUser.username,
          })
        ) {
          foundUser.username = trimmedU;
        } else {
          this.logger.warn(
            `Unable to update username for userId ${id}. The username is invalid`,
          );
        }
      }
    }
  }

  getUserInfo(userId: number): UserInfo | null {
    const result = this.checkAndWarnIfNotRunning("get user info");
    if (result) return null;

    const user = this.users.get(userId);
    if (!user) {
      this.logger.error(
        `Unable to get UserInfo for user with id ${userId}: no user with that id exists`,
      );
      return null;
    }
    return { loggedIn: user.loggedIn, username: user.username };
  }

  processHeartbeatResponse(timestamp: number, clientId: string): void {
    const notRunning = this.checkAndWarnIfNotRunning(
      "process heartbeat response",
    );
    if (notRunning) return;

    const result = this.findUserAndIdByClientId(clientId);
    if (!result) return;
    const [user, id] = result;

    if (!user.loggedIn) {
      this.logger.error(
        `processHeartbeatResponse: Invariant violation: user ${id} has clientId=${user.clientId} but loggedIn=false. `,
      );
      return;
    }
    user.lastHeartbeatResponse = Date.now();
  }

  get numUsers(): number {
    if (this.status === "IDLE" || this.status === "INITIALIZED") {
      this.logger.error(
        `numUsers has not been populated in 'get numUsers'. The current status is ${this.status}`,
      );
    }
    return this._numUsers;
  }

  private checkAndWarnIfNotRunning(action: string): AuthResult | null {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this.status}`,
      );
      return {
        success: false,
        message: "Internal server error: AccountManager not running",
        statusCode: 500,
      };
    }
    return null;
  }

  private addUniqueSessionToken(user: User, token: string): SessionTokenInfo {
    const found = user.sessionTokenInfos.find((info) => info.token === token);
    if (found) {
      // Invariant: tokens should be unique and a freshly issued token shouldn't already exist
      // If this happens, normalise by extending to the full session duration
      this.logger.warn(
        `Session token already existed for user; normalising expiry`,
      );
      found.expiresAtMs = Date.now() + SESSION_DURATION_MS;
      return found;
    }

    const sessionTokenInfo = {
      token,
      expiresAtMs: Date.now() + SESSION_DURATION_MS,
    };
    user.sessionTokenInfos.push(sessionTokenInfo);
    return sessionTokenInfo;
  }

  private getValidSessionTokenInfos(
    sessionTokenInfos: SessionTokenInfo[],
  ): SessionTokenInfo[] {
    const now = Date.now();
    return sessionTokenInfos.filter((info) => {
      return !this.sessionTokenInfoHasExpired(info, now);
    });
  }

  private sessionTokenInfoHasExpired(
    sessionTokenInfo: SessionTokenInfo,
    now: number = Date.now(),
  ): boolean {
    return sessionTokenInfo.expiresAtMs < now;
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

    this.users.forEach((user) => {
      user.sessionTokenInfos = this.getValidSessionTokenInfos(
        user.sessionTokenInfos,
      );
    });
  }
}
