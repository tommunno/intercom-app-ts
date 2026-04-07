import type { AdminUsersChangeRequest } from "../../../shared/types/index.js";
import type { IClientLogger } from "../../shared/contracts/IClientLogger.js";
import setupWss from "../managers/setupWss.js";
import type { UsersSectionInfo } from "../types/index.js";
import {
  createAllowedPlsSetOrNull,
  doAllowedPlsMatch,
  sanitizeUsername,
} from "./setupHelpers.js";

export function sendUsersChangeRequest(
  usersInfo: UsersSectionInfo,
  numPls: number,
  logger: IClientLogger,
): void {
  const changeReq: AdminUsersChangeRequest = [];
  usersInfo.forEach((userInfo, userId) => {
    const {
      username,
      allowedPls,
      changedUsername: cU,
      changedPassword: cP,
      changedAllowedPls: cAP,
    } = userInfo;
    const aPlsSetOrNull = createAllowedPlsSetOrNull(cAP, numPls, logger);
    const sanitizedUsername = sanitizeUsername(cU);
    changeReq.push({
      userId,
      username: sanitizedUsername === username ? null : sanitizedUsername,
      password: cP === "" ? null : cP,
      allowedPls: aPlsSetOrNull
        ? doAllowedPlsMatch(aPlsSetOrNull, allowedPls)
          ? null
          : [...aPlsSetOrNull]
        : null,
    });
  });
  setupWss.send("ADMIN_USERS_CHANGE_REQUEST", changeReq);
}
