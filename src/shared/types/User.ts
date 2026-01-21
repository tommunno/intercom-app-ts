//Helpers:
import {
  dataIsArrayOfType,
  dataIsObject,
  dataIsType,
  dataIsTypeAOrB,
} from "../helpers.js";

export interface BaseUser {
  id: number;
  username: string;
  password: string | null;
}

export interface User extends BaseUser {
  loggedIn: boolean;
  clientId: string | null;
  sessionTokenInUse: string | null;
  sessionTokens: string[];
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
    dataIsTypeAOrB("string", "null", data.sessionTokenInUse) &&
    dataIsArrayOfType("string", data.sessionTokens)
  );
}
