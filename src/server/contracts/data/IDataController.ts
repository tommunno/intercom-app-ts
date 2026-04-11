import type {
  AdminAuthResult,
  AdminUsersChangeRequest,
  AdminUsersLoggedInUpdate,
  AuthResult,
  HeartbeatRequestPayload,
  LoginCredentials,
  UserInfo,
} from "../../../shared/types/index.js";
import type { AudioPopulateData } from "../../types/AudioData.js";
import type { NetworkData } from "../../types/NetworkData.js";
import type {
  AccountAdminUsersApplyResult,
  AccountAdminUsersValidationResult,
} from "./IAccountManager.js";
import type { AdminLogoutResult } from "./IAdminAccountManager.js";

export interface DataAdminInfos {
  usersInfo: UserInfo[];
}

export interface DataHandlers {
  onAccountHeartbeat(
    clientIds: string[],
    payload: HeartbeatRequestPayload,
    isAdmin?: boolean,
  ): void;
  onStaleHeartbeat(clientId: string, isAdmin?: boolean): void;
}

export interface IDataController {
  init: () => void;
  start: () => Promise<void>;
  setHandlers: (handlers: DataHandlers) => void;

  getNetworkData: () => NetworkData;
  getAudioData: () => AudioPopulateData;

  softLoginUser: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AuthResult>;

  //User Account:
  loginUser: (sessionToken: string | null, clientId: string) => AuthResult;

  logoutUser(userId: number, hardLogout?: boolean): number | null;
  logoutUser(clientId: string, hardLogout?: boolean): number | null;

  //Returns userId if successful:
  isClientIdLoggedIn: (clientId: string) => number | null;
  //Returns clientId if successful:
  isUserIdLoggedIn: (userId: number) => string | null;
  getUserInfo: (userId: number) => UserInfo | null;
  getUsersInfo: () => UserInfo[];
  getLoggedInUserClientIds: () => string[];
  processHeartbeatResponse: (timestamp: number, clientId: string) => void;

  //Admin Account:
  softLoginAdmin: (
    sessionToken: string | null,
    logCred: LoginCredentials,
  ) => Promise<AdminAuthResult>;

  loginAdmin(sessionToken: string | null, clientId: string): AdminAuthResult;

  logoutAdmin: (clientId: string, hardLogout?: boolean) => AdminLogoutResult;

  processAdminHeartbeatResponse: (timestamp: number, clientId: string) => void;
  isAdminClientIdLoggedIn: (clientId: string) => boolean;
  getLoggedInAdminClientIds: () => string[];

  getAdminUsersLoggedInUpdate: () => AdminUsersLoggedInUpdate;
  validateAdminUsersChangeRequest: (
    request: AdminUsersChangeRequest,
  ) => AccountAdminUsersValidationResult;
  applyAdminUsersChangeRequest: (
    request: AdminUsersChangeRequest,
  ) => Promise<AccountAdminUsersApplyResult>;
}
