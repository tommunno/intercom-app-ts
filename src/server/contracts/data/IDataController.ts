import type {
  AuthResult,
  LoginCredentials,
  UserInfo,
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

  //Returns userId if successful:
  isClientIdLoggedIn: (clientId: string) => number | null;
  //Returns clientId if successful:
  isUserIdLoggedIn: (userId: number) => string | null;
  getUserInfo: (userId: number) => UserInfo | null;
}
