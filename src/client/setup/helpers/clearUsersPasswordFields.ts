import type { IClientLogger } from "../../shared/contracts/IClientLogger.js";
import type { UsersSectionInfo } from "../types/UsersSectionInfo.js";
import {
  createAllowedPlsSetOrNull,
  createAllowedPlsString,
} from "./setupHelpers.js";

//Empty the password fields and format the allowedPls fields:
export function normalizeUsersInfoAfterSave(
  usersInfo: UsersSectionInfo,
  numPls: number,
  logger: IClientLogger,
): UsersSectionInfo {
  return usersInfo.map((userInfo) => {
    const aPlsSetOrNull = createAllowedPlsSetOrNull(
      userInfo.changedAllowedPls,
      numPls,
      logger,
    );
    return {
      ...userInfo,
      changedPassword: "",
      changedAllowedPls: aPlsSetOrNull
        ? createAllowedPlsString([...aPlsSetOrNull], logger)
        : "",
    };
  });
}
