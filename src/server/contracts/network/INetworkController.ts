import type {
  AuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";

export interface NetworkHandlers {
  onHttpUserLoginRequest: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials
  ) => Promise<AuthResult>;
  onWsUserLoginRequest: (
    sessionToken: string,
    clientUid: string
  ) => Promise<AuthResult>;
}

export interface INetworkController {
  init(): void;
  start(): void;
  setHandlers(handlers: NetworkHandlers): void;
}
