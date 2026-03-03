import type {
  AdminAuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";
import type { AdminAccountData } from "../../types/index.js";

export interface AdminAccountHandlers {}

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
}
