//Helpers:
import { dataIsObject, dataIsType, dataIsTypeAOrB } from "../helpers.js";
import {
  dataIsArrayOfSessionTokenInfos,
  dataIsSessionTokenInfo,
  type SessionTokenInfo,
} from "./SessionTokenInfo.js";

export interface BaseUser {
  id: number;
  username: string;
  password: string | null;
}

export interface User extends BaseUser {
  loggedIn: boolean;
  clientId: string | null;
  sessionTokenInfoInUse: SessionTokenInfo | null;
  sessionTokenInfos: SessionTokenInfo[];
  lastHeartbeatResponse: number | null;
}

export function dataIsBaseUser(data: unknown): data is BaseUser {
  return (
    dataIsObject(data) &&
    dataIsType("number", data.id) &&
    dataIsType("string", data.username) &&
    dataIsTypeAOrB("string", "null", data.password)
  );
}

export function dataIsUser(data: unknown): data is User {
  return (
    dataIsObject(data) &&
    dataIsBaseUser(data) &&
    dataIsType("boolean", data.loggedIn) &&
    dataIsTypeAOrB("string", "null", data.clientId) &&
    (dataIsSessionTokenInfo(data.sessionTokenInfoInUse) ||
      data.sessionTokenInfoInUse === null) &&
    dataIsArrayOfSessionTokenInfos(data.sessionTokenInfos) &&
    dataIsTypeAOrB("number", "null", data.lastHeartbeatResponse)
  );
}
