import type {
  AuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";

export interface IDataController {
  init(): void;
  start(): void;

  softLoginUser(
    sessionToken: string | null,
    loginCredentials: LoginCredentials
  ): Promise<AuthResult>;
  loginUser(sessionToken: string, clientUid: string): Promise<AuthResult>;
}
