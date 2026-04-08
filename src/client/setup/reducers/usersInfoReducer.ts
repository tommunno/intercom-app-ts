import type {
  AdminUsersInfo,
  AdminUsersLoggedInUpdate,
} from "../../../shared/types/index.js";
import logger from "../../shared/logging/logger.js";
import type { UsersSectionInputType } from "../components/sections/users-section/UsersSection.js";
import {
  createAllowedPlsSetOrNull,
  createAllowedPlsString,
  doAllowedPlsMatch,
  sanitizeUsername,
} from "../helpers/setupHelpers.js";
import type { UsersSectionInfo } from "../types/index.js";

const log = logger.child({ context: "UsersInfoReducer" });

type UsersSectionInfoAction =
  | {
      type: "new-server-data";
      serverData: AdminUsersInfo;
      numPls: number;
    }
  | {
      type: "new-users-logged-in";
      usersLoggedIn: AdminUsersLoggedInUpdate;
    }
  | {
      type: "normalize-after-save";
      numPls: number;
    }
  | {
      type: "new-input-value";
      inputType: UsersSectionInputType;
      userId: number;
      newValue: string;
    }
  | {
      type: "replace-users-info";
      newUsersInfo: UsersSectionInfo;
    };

export function usersInfoReducer(
  prevUsersInfo: UsersSectionInfo,
  action: UsersSectionInfoAction,
): UsersSectionInfo {
  switch (action.type) {
    case "new-server-data": {
      const { serverData, numPls } = action;
      return handleNewServerData(prevUsersInfo, serverData, numPls);
    }
    case "new-users-logged-in": {
      const { usersLoggedIn } = action;
      return handleNewUsersLoggedIn(prevUsersInfo, usersLoggedIn);
    }
    case "normalize-after-save": {
      const { numPls } = action;
      return handleNormalizeAfterSave(prevUsersInfo, numPls);
    }
    case "new-input-value": {
      const { inputType, userId, newValue } = action;
      return handleNewInputValue(prevUsersInfo, inputType, userId, newValue);
    }
    case "replace-users-info": {
      return action.newUsersInfo;
    }
  }
}

function handleNewServerData(
  prevUsersInfo: UsersSectionInfo,
  serverData: AdminUsersInfo,
  numPls: number,
): UsersSectionInfo {
  const newInfo: UsersSectionInfo = [];
  serverData.forEach((userInfo, i) => {
    const { loggedIn, username, allowedPls: aPLs } = userInfo;
    const prevUI = prevUsersInfo[i];
    if (!prevUI) {
      newInfo.push({
        id: i,
        loggedIn,
        username,
        changedUsername: username,
        usernameErr: false,
        changedPassword: "",
        passwordErr: false,
        allowedPls: new Set(aPLs),
        changedAllowedPls: createAllowedPlsString(aPLs, log),
        allowedPlsErr: false,
      });
      return;
    }
    const shouldUpdateUsername =
      sanitizeUsername(prevUI.changedUsername) === prevUI.username;
    const shouldUpdatePassword = prevUI.changedPassword.length === 0;
    const prevChangedAPlsSetOrNull = createAllowedPlsSetOrNull(
      prevUI.changedAllowedPls,
      numPls,
      log,
    );
    const shouldUpdateAllowedPls = prevChangedAPlsSetOrNull
      ? doAllowedPlsMatch(prevChangedAPlsSetOrNull, prevUI.allowedPls)
      : false;
    const changedUsername = shouldUpdateUsername
      ? userInfo.username
      : prevUI.changedUsername;
    const changedPassword = prevUI.changedPassword;
    const changedAllowedPls: string = shouldUpdateAllowedPls
      ? createAllowedPlsString(aPLs, log)
      : prevUI.changedAllowedPls;

    newInfo.push({
      id: i,
      loggedIn,
      username,
      changedUsername,
      usernameErr: shouldUpdateUsername ? false : prevUI.usernameErr,
      changedPassword,
      passwordErr: shouldUpdatePassword ? false : prevUI.passwordErr,
      allowedPls: new Set(aPLs),
      changedAllowedPls,
      allowedPlsErr: shouldUpdateAllowedPls ? false : prevUI.allowedPlsErr,
    });
  });
  return newInfo;
}

function handleNewUsersLoggedIn(
  prevUsersInfo: UsersSectionInfo,
  usersLoggedIn: AdminUsersLoggedInUpdate,
): UsersSectionInfo {
  return prevUsersInfo.map((prevUserInfo, i) => {
    const user = usersLoggedIn[i];
    if (!user) {
      return prevUserInfo;
    }
    return { ...prevUserInfo, loggedIn: user.loggedIn };
  });
}

function handleNormalizeAfterSave(
  prevUsersInfo: UsersSectionInfo,
  numPls: number,
): UsersSectionInfo {
  return prevUsersInfo.map((userInfo) => {
    const aPlsSetOrNull = createAllowedPlsSetOrNull(
      userInfo.changedAllowedPls,
      numPls,
      log,
    );
    return {
      ...userInfo,
      changedPassword: "",
      changedAllowedPls: aPlsSetOrNull
        ? createAllowedPlsString([...aPlsSetOrNull], log)
        : "",
    };
  });
}

function handleNewInputValue(
  prevUsersInfo: UsersSectionInfo,
  inputType: UsersSectionInputType,
  userId: number,
  newValue: string,
): UsersSectionInfo {
  const prevUserInfo = prevUsersInfo[userId];
  if (!prevUserInfo) {
    log.error(`handleInputChange: No userInfo found for userId ${userId}`);
    return prevUsersInfo;
  }

  return prevUsersInfo.map((userInfo, i) => {
    if (i !== userId) {
      return userInfo;
    }

    switch (inputType) {
      case "username":
        return { ...userInfo, changedUsername: newValue };
      case "password":
        return { ...userInfo, changedPassword: newValue };
      case "allowed-pls":
        return { ...userInfo, changedAllowedPls: newValue };
    }
  });
}
