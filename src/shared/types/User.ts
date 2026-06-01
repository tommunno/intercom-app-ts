import { dataIsObject, dataIsType, dataIsTypeAOrB } from "../helpers.js";
import {
  dataIsArrayOfSessionTokenInfos,
  type SessionTokenInfo,
} from "./SessionTokenInfo.js";

export interface PersistedUser {
  username: string;
  passwordHash: string | null;
  sessionTokenInfos: SessionTokenInfo[];
}

export interface User extends PersistedUser {
  loggedIn: boolean;
  clientId: string | null;
  sessionTokenInfoInUse: SessionTokenInfo | null;
  lastHeartbeatResponse: number | null;
}

export type UserAndId = [user: User, userId: number];

export function dataIsPersistedUser(data: unknown): data is PersistedUser {
  return (
    dataIsObject(data) &&
    dataIsType("string", data.username) &&
    dataIsTypeAOrB("string", "null", data.passwordHash) &&
    dataIsArrayOfSessionTokenInfos(data.sessionTokenInfos)
  );
}
