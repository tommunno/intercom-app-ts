import type {
  HeartbeatRequestPayload,
  SessionTokenInfo,
} from "../../../shared/types/index.js";
import type {
  AuthResult,
  BaseUser,
  LoginCredentials,
  User,
  UserInfo,
} from "../../../shared/types/index.js";
import type { AccountManagerConfig } from "../../types/index.js";

export type HardLoginUserParams =
  | {
      user: User;
      loginTakeover: false;
      clientId: string | null;
      sessionToken: string;
    }
  | {
      user: User;
      loginTakeover: true;
      clientId: string | null;
      sessionToken: string;
      loggedOutClientId: string;
    };

export interface AccountHandlers {
  onHeartbeat(clientIds: string[], payload: HeartbeatRequestPayload): void;
  onStaleHeartbeat(clientId: string): void;
}

export interface IAccountManager {
  init: (config: AccountManagerConfig) => void;
  start: () => void;
  stop: () => void;
  setHandlers: (handlers: AccountHandlers) => void;

  softLoginUser: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AuthResult>;

  loginUser: (sessionToken: string | null, clientId: string) => AuthResult;

  logoutUser(userId: number, hardLogout?: boolean): number | null;
  logoutUser(clientId: string, hardLogout?: boolean): number | null;
  logoutUser(user: User, hardLogout?: boolean): number | null;

  //Returns the userId if logged in
  isClientIdLoggedIn(clientId: string): number | null;
  //Returns clientId if successful:
  isUserIdLoggedIn: (userId: number) => string | null;
  updateUsers: (users: BaseUser[]) => Promise<void>;
  getUserInfo: (userId: number) => UserInfo | null;
  processHeartbeatResponse: (timestamp: number, clientId: string) => void;
}
