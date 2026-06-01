import {
  dataIsObject,
  dataIsType,
  dataIsTypeAOrB,
} from "../../shared/helpers.js";
import {
  dataIsArrayOfSessionTokenInfos,
  type SessionTokenInfo,
} from "../../shared/types/index.js";

export interface AdminAccountData {
  username?: string;
  passwordHash?: string;
  sessionTokenInfos?: SessionTokenInfo[];
}

export function dataIsAdminAccountData(
  data: unknown,
): data is AdminAccountData {
  return (
    dataIsObject(data) &&
    dataIsTypeAOrB("string", "undefined", data.username) &&
    dataIsTypeAOrB("string", "undefined", data.passwordHash) &&
    (dataIsArrayOfSessionTokenInfos(data.sessionTokenInfos) ||
      dataIsType("undefined", data.sessionTokenInfos))
  );
}
