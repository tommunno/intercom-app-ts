import {
  dataIsObject,
  dataIsType,
  dataIsTypeAOrB,
} from "../../shared/helpers.js";
import {
  dataIsPersistedUser,
  type PersistedUser,
} from "../../shared/types/User.js";

export interface AccountData {
  numUsers?: number;
  persistedUsers?: PersistedUsers;
}

//An object with userID as each key, and PersistedUser as each value:
export type PersistedUsers = Record<number, PersistedUser>;

export function dataIsPersistedUsers(data: unknown): data is PersistedUsers {
  return (
    dataIsObject(data) &&
    Object.entries(data).every(([key, value]) => {
      const keyAsNumber = Number(key);

      return (
        dataIsType("safeIntegerNum", keyAsNumber) &&
        keyAsNumber >= 0 &&
        String(keyAsNumber) === key &&
        dataIsPersistedUser(value)
      );
    })
  );
}

export function dataIsAccountData(data: unknown): data is AccountData {
  return (
    dataIsObject(data) &&
    dataIsTypeAOrB("number", "undefined", data.numUsers) &&
    (dataIsPersistedUsers(data.persistedUsers) ||
      dataIsType("undefined", data.persistedUsers))
  );
}
