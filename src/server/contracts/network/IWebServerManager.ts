import type {
  AuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";

export interface WebServerHandlers {
  onUserLoginRequest: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials
  ) => Promise<AuthResult>;
}

export interface IWebServerManager {
  init(): void;
  start(): void;
  setHandlers(handlers: WebServerHandlers): void;
  setPorts(httpPort: number, httpsPort: number): boolean;
}
