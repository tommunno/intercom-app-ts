import type { IClientLogger } from "../../shared/contracts/index.js";
import type {
  UsersSectionColumnErrs,
  UsersSectionInputType,
} from "../components/sections/users-section/UsersSection.js";
import type { UsersSectionInfo } from "../types/index.js";
import {
  createAllowedPlsSetOrNull,
  sanitizeUsername,
  validatePassword,
  validateUsername,
} from "./setupHelpers.js";

export type CalculateUsersErrsParams =
  | {
      id: number;
      type: UsersSectionInputType;
      usersInfo: UsersSectionInfo;
      columnErrs: UsersSectionColumnErrs;
      numPls: number;
      preserveNoColumnErrs?: boolean;
      logger: IClientLogger;
    }
  | {
      id: null;
      usersInfo: UsersSectionInfo;
      columnErrs: UsersSectionColumnErrs;
      numPls: number;
      preserveNoColumnErrs?: boolean;
      logger: IClientLogger;
    };

export interface CalculateUsersErrsResult {
  usersInfo: UsersSectionInfo;
  columnErrs: UsersSectionColumnErrs;
}

//If id is null, column errors are checked across all user fields. Otherwise, only the specified id and field type is checked
// If preserveNoColumnErrs=true, no new column errors will be added if there are currently no column errors
//preserveNoColumnErrs defaults to false
export function calculateUsersErrs(
  params: CalculateUsersErrsParams,
): CalculateUsersErrsResult {
  const { id, usersInfo, columnErrs, numPls, preserveNoColumnErrs, logger } =
    params;

  let idFound = false;
  const changedUsernames: string[] = [];
  const newUsersInfo: UsersSectionInfo = usersInfo.map((userInfo, i) => {
    changedUsernames.push(userInfo.changedUsername);

    const idMatches = id === i;
    if (idMatches) idFound = true;

    if (id === null || idMatches) {
      const {
        changedUsername: cU,
        changedPassword: cP,
        changedAllowedPls: cAPls,
      } = userInfo;

      //If id is null, check all fields:
      if (id === null) {
        return {
          ...userInfo,
          usernameErr: !validateUsername(sanitizeUsername(cU)),
          passwordErr: !validatePassword(cP),
          allowedPlsErr: !createAllowedPlsSetOrNull(cAPls, numPls, logger),
        };
      }
      //Otherwise, only check the specified type for this id:
      switch (params.type) {
        case "username":
          return {
            ...userInfo,
            usernameErr: !validateUsername(
              sanitizeUsername(userInfo.changedUsername),
            ),
          };
        case "password":
          return {
            ...userInfo,
            passwordErr: !validatePassword(userInfo.changedPassword),
          };
        case "allowed-pls":
          return {
            ...userInfo,
            allowedPlsErr: !createAllowedPlsSetOrNull(cAPls, numPls, logger),
          };
      }
    }
    return userInfo;
  });
  if (id !== null && !idFound) {
    logger.error(`calculateUsersErrs: id ${id} not found`);
  }

  //If preserveNoColumnErrs=true, if all column errors are currently false, then we preserve that state:
  if (preserveNoColumnErrs && Object.values(columnErrs).every((err) => !err)) {
    return { usersInfo: newUsersInfo, columnErrs };
  }

  const columnUsernameErr = newUsersInfo.some((u) => u.usernameErr);
  const columnPasswordErr = newUsersInfo.some((u) => u.passwordErr);
  const columnAllowedPlsErr = newUsersInfo.some((u) => u.allowedPlsErr);
  const columnUsernameClashesErr =
    changedUsernames.length !== new Set(changedUsernames).size;

  const newColumnErrs: UsersSectionColumnErrs = {
    usernameErr: columnUsernameErr,
    passwordErr: columnPasswordErr,
    allowedPlsErr: columnAllowedPlsErr,
    usernameClashesErr: columnUsernameClashesErr,
  };

  return { usersInfo: newUsersInfo, columnErrs: newColumnErrs };
}
