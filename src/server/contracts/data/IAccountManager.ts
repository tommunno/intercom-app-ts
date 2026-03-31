import type {
  AdminUsersChangeRequest,
  AdminUsersLoggedInUpdate,
  HeartbeatRequestPayload,
  SessionTokenInfo,
  UserAndId,
} from "../../../shared/types/index.js";
import type {
  AuthResult,
  LoginCredentials,
  User,
  UserInfo,
} from "../../../shared/types/index.js";
import type { AccountData } from "../../types/index.js";

export type HardLoginUserParams =
  | {
      user: User;
      userId: number;
      loginTakeover: false;
      clientId: string | null;
      sessionTokenInfo: SessionTokenInfo;
    }
  | {
      user: User;
      userId: number;
      loginTakeover: true;
      clientId: string | null;
      sessionTokenInfo: SessionTokenInfo;
      loggedOutClientId: string;
    };

export interface AccountHandlers {
  onHeartbeat(clientIds: string[], payload: HeartbeatRequestPayload): void;
  onStaleHeartbeat(clientId: string): void;
}

export type AccountAdminUsersChangeRequestResult =
  | {
      success: true;
      userIdsToUpdate: number[];
      userIdsToHardLogout: number[];
    }
  | {
      success: false;
      message: string;
      userIdsToUpdate: number[];
      userIdsToHardLogout: number[];
    };

export interface IAccountManager {
  init: () => void;
  populate: (data: AccountData) => void;
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
  logoutUser(userAndId: UserAndId, hardLogout?: boolean): number | null;

  //Returns the userId if logged in
  isClientIdLoggedIn(clientId: string): number | null;
  //Returns clientId if logged in:
  isUserIdLoggedIn: (userId: number) => string | null;
  getUserInfo: (userId: number) => UserInfo | null;
  getUsersInfo: () => UserInfo[];
  processHeartbeatResponse: (timestamp: number, clientId: string) => void;
  getLoggedInUserClientIds: () => string[];
  getAdminUsersLoggedInUpdate: () => AdminUsersLoggedInUpdate;
  processAdminUsersChangeRequest: (
    changeRequest: AdminUsersChangeRequest,
  ) => Promise<AccountAdminUsersChangeRequestResult>;

  numUsers: number;
}
