import type {
  AuthResult,
  BaseUser,
  LoginCredentials,
  User,
} from "../../../shared/types/index.js";
import type {
  AccountManagerState,
  AccountManagerConfig,
} from "../../types/index.js";

export interface IAccountManager {
  init: (config: AccountManagerConfig) => void;
  start: () => void;

  softLoginUser: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AuthResult>;

  loginUser: (sessionToken: string | null, clientId: string) => AuthResult;

  logoutUser: (params: {
    userId?: number;
    user?: User;
    hardLogout?: boolean;
  }) => number | null;

  updateUsers: (users: BaseUser[]) => Promise<void>;
}
