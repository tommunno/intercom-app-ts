import type {
  AuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";
import type { Servers, WebServerData } from "../../types/index.js";

export interface WebServerHandlers {
  onUserSoftLoginRequest: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AuthResult>;
}

export interface IWebServerManager {
  init: () => Servers;
  populate: (data: WebServerData) => void;
  start: () => void;
  setHandlers: (handlers: WebServerHandlers) => void;
  // setPorts: (httpPort: number, httpsPort: number) => boolean;
}
