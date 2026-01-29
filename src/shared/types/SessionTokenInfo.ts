import { dataIsObject, dataIsType } from "../helpers.js";

export interface SessionTokenInfo {
  token: string;
  expiresAtMs: number; //Date.now()
}

export function dataIsSessionTokenInfo(
  data: unknown,
): data is SessionTokenInfo {
  return (
    dataIsObject(data) &&
    dataIsType("string", data.token) &&
    dataIsType("number", data.expiresAtMs)
  );
}

export function dataIsArrayOfSessionTokenInfos(
  data: unknown,
): data is SessionTokenInfo[] {
  return Array.isArray(data) && data.every((el) => dataIsSessionTokenInfo(el));
}
