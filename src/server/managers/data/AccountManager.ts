//Client/Server shared Types:
import type {
  LoginCredentials,
  User,
  ManagerState,
  AuthResult,
  BaseUser,
} from "../../../shared/types/index.js";
//Server Types:
import type { AccountManagerConfig } from "../../types/index.js";
//Contracts:
import type { IAccountManager, ILogger } from "../../contracts/index.js";
//Constants:
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  SALT_ROUNDS,
} from "../../constants/serverConstants.js";
//External Libraries:
import crypto from "node:crypto";
import bcrypt from "bcrypt";

export class AccountManager implements IAccountManager {
  private state: ManagerState = "IDLE";
  private numUsers: number = 0;
  private users: User[] = [];

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "AccountManager" });
  }

  init({ numUsers, loadedUsers }: AccountManagerConfig): void {
    if (this.state !== "IDLE")
      throw new Error(
        `Cannot initialize the AccountManager whilst its state is ${this.state}`
      );
    this.numUsers = numUsers;
    this.createUsers(loadedUsers);
    this.state = "INITIALIZED";
  }

  start(): void {
    if (this.state !== "INITIALIZED")
      throw new Error(
        `Cannot start the AccountManager whilst its state is ${this.state}`
      );
    this.state = "RUNNING";
  }

  stop(): void {
    if (this.state !== "RUNNING") {
      this.logger.warn(
        `Cannot stop the AccountManager whilst its state is ${this.state}`
      );
      return;
    }
    this.numUsers = 0;
    this.users = [];
    this.state = "IDLE";
  }

  private createUsers(loadedUsers: unknown): void {
    if (!Array.isArray(loadedUsers)) {
      this.logger.warn(
        `User data could not be loaded correctly. Starting with an empty user list.`
      );
      this.createEmptyUsers();
      return;
    }
    this.users = [];
    for (let i = 0; i < this.numUsers; i++) {
      if (i >= loadedUsers.length) {
        this.users.push(this.returnEmptyUser(i));
        continue;
      }
      const data = loadedUsers[i];
      if (this.dataIsUser(data) && this.validateUser(data))
        this.users.push({
          id: i,
          loggedIn: false,
          username: data.username,
          password: data.password,
          clientId: null,
          sessionTokenInUse: null,
          sessionTokens: [...data.sessionTokens],
        });
      else {
        this.logger.warn(
          `User data could not be loaded correctly. Invalid user at index ${i}. Starting with an empty user list`
        );
        this.createEmptyUsers();
        return;
      }
    }
    if (this.numUsers > loadedUsers.length)
      this.logger.warn(
        `The user list was incomplete and has been automatically filled in`
      );
    else if (this.numUsers < loadedUsers.length)
      this.logger.warn(
        `The user list was longer than expected, so extra entries were removed`
      );
  }

  private createEmptyUsers(): void {
    this.users = [];
    for (let i = 0; i < this.numUsers; i++) {
      this.users.push(this.returnEmptyUser(i));
    }
  }

  private returnEmptyUser(id: number): User {
    return {
      id,
      loggedIn: false,
      username: `user-${id}`,
      password: null,
      clientId: null,
      sessionTokenInUse: null,
      sessionTokens: [],
    };
  }

  //Checks types:
  private dataIsUser(data: unknown): data is User {
    if (!data || typeof data !== "object") return false;

    const d = data as Record<string, unknown>;

    if (!Array.isArray(d.sessionTokens)) return false;
    const everyElIsString = d.sessionTokens.every(
      (el) => typeof el === "string"
    );
    if (!everyElIsString) return false;

    return (
      typeof d.id === "number" &&
      typeof d.loggedIn === "boolean" &&
      typeof d.username === "string" &&
      (typeof d.password === "string" || d.password === null) &&
      (typeof d.clientId === "string" || d.clientId === null) &&
      (typeof d.sessionTokenInUse === "string" || d.sessionTokenInUse === null)
    );
  }

  //Checks logic:
  private validateUser(user: User, textPassword = false): boolean {
    if (user.clientId !== null && user.clientId.trim() === "") {
      this.logger.warn(`User ${user.username} has an invalid clientId`);
      return false;
    }
    if (
      user.sessionTokenInUse !== null &&
      user.sessionTokenInUse.trim() === ""
    ) {
      this.logger.warn(
        `User ${user.username} has an invalid sessionTokenInUse`
      );
      return false;
    }
    const someElsEmpty = user.sessionTokens.some((el) => el.trim() === "");
    if (someElsEmpty) {
      this.logger.warn(
        `User ${user.username} has an invalid sessionTokens array`
      );
      return false;
    }

    return this.validateBaseUser(user, textPassword);
  }

  private validateBaseUser(user: BaseUser, textPassword = false): boolean {
    if (!Number.isInteger(user.id) || user.id < 0) {
      this.logger.warn(`User id ${user.id} for ${user.username} is invalid`);
      return false;
    }
    if (
      user.username.length > MAX_USERNAME_LENGTH ||
      user.username.trim() === ""
    ) {
      this.logger.warn(`Username ${user.username} is invalid`);
      return false;
    }
    if (textPassword && user.password !== null) {
      if (
        user.password.length < MIN_PASSWORD_LENGTH ||
        user.password.length > MAX_PASSWORD_LENGTH
      ) {
        this.logger.warn(`User ${user.username} has an invalid password`);
        return false;
      }
    }
    return true;
  }

  private async authenticateUserWithCredentials({
    username,
    password,
  }: LoginCredentials): Promise<AuthResult> {
    const baseResult: AuthResult = {
      success: false,
      message: "",
      statusCode: 401,
      userId: null,
      newSessionToken: null,
      loginTakeover: false,
      clientId: null,
    };

    if (username === null || password === null) {
      return { ...baseResult, message: "Missing credentials", statusCode: 400 };
    }
    //If no found user, or if the password for the found user hasn't been set yet
    const foundUser = this.users.find((user) => user.username === username);
    if (!foundUser || foundUser.password === null) {
      return { ...baseResult, message: "Incorrect username or password" };
    }

    const passwordMatch = await bcrypt.compare(password, foundUser.password);
    if (!passwordMatch) {
      return { ...baseResult, message: "Incorrect username or password" };
    }

    //We now have valid credentials
    //If the user is already logged in, we don't allow a login
    if (foundUser.loggedIn) {
      return {
        ...baseResult,
        message: "User already logged in",
        statusCode: 409,
      };
    }

    //foundUser is not logged in, and credentials match. Client has been succesfully authenticated, and a new sessionToken will be handed out. But the client will not be logged in until it is 'hard' logged in via WS!
    const newSessionToken = this.generateSessionToken();
    foundUser.sessionTokens.push(newSessionToken);

    return {
      ...baseResult,
      success: true,
      message: "Login approved with credentials",
      statusCode: 200,
      newSessionToken,
    };
  }

  private authenticateUserWithToken(sessionToken: string | null): AuthResult {
    const baseResult: AuthResult = {
      success: false,
      message: "",
      statusCode: 400,
      userId: null,
      newSessionToken: null,
      loginTakeover: false,
      clientId: null,
    };

    if (sessionToken === null) {
      return {
        ...baseResult,
        message: "No credentials or session token provided",
      };
    }

    const foundUser = this.users.find((user) =>
      user.sessionTokens.includes(sessionToken)
    );

    if (!foundUser) {
      return {
        ...baseResult,
        message: "Invalid session token",
        statusCode: 401,
      };
    }
    //We have now found a user

    const sessionTokenMatch = sessionToken === foundUser.sessionTokenInUse;

    //If the user is already logged in and the client is logging in using a different sessionToken, we don't allow this
    if (foundUser.loggedIn && !sessionTokenMatch) {
      return {
        ...baseResult,
        message: "User already logged in",
        statusCode: 409,
      };
    }
    //If user is logged in and there is a sessionToken match, then we can do a login takeover (logging out the old client, and doing a soft login for the new one). The new client will not be 'hard' logged in until they login via WS!
    if (foundUser.loggedIn && sessionTokenMatch) {
      this.logoutUser({ user: foundUser, loginTakeover: true });

      return {
        ...baseResult,
        success: true,
        message: "Login takeover with session token",
        statusCode: 200,
        loginTakeover: true,
        userId: foundUser.id,
      };
    }
    //foundUser is not logged in. Client has been succesfully authenticated, but will not be logged in until the client is 'hard' logged in via WS!
    return {
      ...baseResult,
      success: true,
      message: "Login approved with session token",
      statusCode: 200,
    };
  }

  private generateSessionToken() {
    return crypto.randomUUID();
  }

  //If the user is getting logged out as part of a loginTakeover, then we keep the sessionToken in the sessionTokens array
  logoutUser({
    userId,
    user,
    loginTakeover = false,
  }: {
    userId?: number;
    user?: User;
    loginTakeover?: boolean;
  }): boolean {
    if (this.state !== "RUNNING") {
      this.logger.error(
        `Unable to logout user because the state is ${this.state}`
      );
      return false;
    }
    if (userId === undefined && user === undefined) {
      this.logger.warn(
        `No userId and no user was passed into logoutUser. Will not logout any user`
      );
      return false;
    }
    if (!user) user = this.users.find((u) => u.id === userId);
    if (!user) {
      this.logger.warn(
        `Cannot logout user with id ${userId}, because the user doesn't exist`
      );
      return false;
    }
    user.loggedIn = false;

    if (!loginTakeover && user.sessionTokenInUse) {
      user.sessionTokens = user.sessionTokens.filter(
        (t) => t !== user.sessionTokenInUse
      );
    }

    user.sessionTokenInUse = null;

    return true;
  }

  async softLoginUser(
    sessionToken: string | null,
    logCred: LoginCredentials
  ): Promise<AuthResult> {
    if (this.state !== "RUNNING") {
      this.logger.error(
        `Unable to soft login user because the state is ${this.state}`
      );
      return {
        success: false,
        message: "Internal server error: AccountManager not running",
        statusCode: 500,
        userId: null,
        newSessionToken: null,
        loginTakeover: false,
        clientId: null,
      };
    }
    //If a username or password has been provided, use these credentials instead of the existing sessionToken, and issue a new sessionToken if authenticated
    if (logCred.username !== null || logCred.password !== null) {
      return this.authenticateUserWithCredentials(logCred);
    }
    //Otherwise, we try to use the existing sessionToken to authenticate:
    return this.authenticateUserWithToken(sessionToken);
  }

  async updateUsers(users: BaseUser[]) {
    if (this.state !== "RUNNING") {
      this.logger.error(
        `Unable to update users because the state is ${this.state}`
      );
      return;
    }
    for (let user of users) {
      const success = this.validateBaseUser(user, true);
      if (!success) continue;
      const foundUser = this.users.find((u) => u.id === user.id);
      if (!foundUser) {
        this.logger.warn(
          `Unable to find user with ID of ${user.id} in updateUsers`
        );
      } else {
        foundUser.username = user.username;
        if (user.password !== null) {
          const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
          foundUser.password = hash;
        }
      }
    }
  }
}
