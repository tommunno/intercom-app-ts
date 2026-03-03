import type { SessionTokenInfo } from "../../shared/types/index.js";

export interface AdminAccountData {
  username?: string;
  passwordHash?: string;
  sessionTokenInfos?: SessionTokenInfo[];
}
