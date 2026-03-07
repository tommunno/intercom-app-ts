import type {
  AdminAuthResult,
  HeartbeatRequestPayload,
  LoginCredentials,
} from "../../../shared/types/index.js";
import type { AdminAccountData } from "../../types/index.js";

export interface AdminLogoutResult {
  success: boolean;
  otherLoggedOutClientIds: string[];
}

export interface AdminAccountHandlers {
  onHeartbeat(clientIds: string[], payload: HeartbeatRequestPayload): void;
  onStaleHeartbeat(clientId: string): void;
}

export interface IAdminAccountManager {
  init: () => void;
  populate: (data: AdminAccountData) => Promise<void>;
  start: () => void;
  stop: () => void;
  setHandlers: (handlers: AdminAccountHandlers) => void;
  softLogin: (
    sessionToken: string | null,
    logCred: LoginCredentials,
  ) => Promise<AdminAuthResult>;
  login: (sessionToken: string | null, clientId: string) => AdminAuthResult;
  logout: (clientId: string, hardLogout?: boolean) => AdminLogoutResult;
  processHeartbeatResponse: (timestamp: number, clientId: string) => void;
  isClientIdLoggedIn: (clientId: string) => boolean;
  getLoggedInClientIds: () => string[];
}
