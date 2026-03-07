import { type SessionTokenInfo } from "./SessionTokenInfo.js";

export interface PersistedUser {
  username: string;
  passwordHash: string | null;
  allowedPls: number[];
  sessionTokenInfos: SessionTokenInfo[];
}

export interface User extends PersistedUser {
  loggedIn: boolean;
  clientId: string | null;
  sessionTokenInfoInUse: SessionTokenInfo | null;
  lastHeartbeatResponse: number | null;
}

export type UserAndId = [user: User, userId: number];
