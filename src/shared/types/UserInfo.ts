//Helpers:
import { dataIsObject, dataIsType } from "../helpers.js";

export interface UserInfo {
  loggedIn: boolean;
  username: string;
}

export function dataIsUserInfo(data: unknown): data is UserInfo {
  return (
    dataIsObject(data) &&
    dataIsType("boolean", data.loggedIn) &&
    dataIsType("string", data.username)
  );
}
