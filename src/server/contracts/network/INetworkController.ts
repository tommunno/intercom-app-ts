import type {
  AuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";
import type { WssMessageHandler } from "./IWssManager.js";

export interface NetworkHandlers {
  onHttpUserLoginRequest: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials
  ) => Promise<AuthResult>;
  onWssMessage: WssMessageHandler;
}

export interface INetworkController {
  init(): void;
  start(): void;
  setHandlers(handlers: NetworkHandlers): void;
  setWebServerPorts(httpPort: number, httpsPort: number): boolean;
}
