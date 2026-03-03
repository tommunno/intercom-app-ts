import type {
  AdminAuthResult,
  AuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";
import type { Servers, WebServerResolvedData } from "../../types/index.js";

export interface WebServerHandlers {
  onUserSoftLoginRequest: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AuthResult>;
  onAdminSoftLoginRequest: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AdminAuthResult>;
}

export interface IWebServerManager {
  init: () => Promise<Servers>;
  populate: (data: WebServerResolvedData) => void;
  start: () => void;
  setHandlers: (handlers: WebServerHandlers) => void;
}
