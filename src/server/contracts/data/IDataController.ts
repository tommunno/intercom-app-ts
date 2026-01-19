import type {
  AuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";
import type { WssSendMessage } from "../../types/WssSendMessage.js";

export interface IDataController {
  init: () => void;
  start: () => void;

  softLoginUser: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AuthResult>;

  loginUser: (sessionToken: string | null, clientId: string) => AuthResult;

  logoutUser: ({
    clientId,
    userId,
  }: {
    clientId?: string;
    userId?: number;
  }) => number | null;
}
