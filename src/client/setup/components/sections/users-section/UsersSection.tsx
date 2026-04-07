import { useState } from "react";
import { flushSync } from "react-dom";
import { UsersSectionBanner } from "./UsersSectionBanner.jsx";
import UsersSectionRow from "./UsersSectionRow.jsx";
import logger from "../../../../shared/logging/logger.js";
import type { UsersSectionInfo } from "../../../types/index.js";
import type {
  AdminUsersLoggedInUpdate,
  AdminUsersInfo,
} from "../../../../../shared/types/index.js";
import {
  useAudioConfigInfo,
  useUsersInfo,
  useUsersLoggedIn,
} from "../../../hooks/index.js";
import {
  sanitizeUsername,
  sendUsersChangeRequest,
  calculateUsersErrs,
  createAllowedPlsString,
  createAllowedPlsSetOrNull,
  doAllowedPlsMatch,
  normalizeUsersInfoAfterSave,
} from "../../../helpers/index.js";
import type { DialogBoxConfig } from "../../overlays/DialogBox.js";

const log = logger.child({ context: "UsersSection" });

export type UsersSectionInputType = "username" | "password" | "allowed-pls";

export interface UsersSectionColumnErrs {
  usernameErr: boolean;
  passwordErr: boolean;
  allowedPlsErr: boolean;
}

export interface UsersSectionProps {
  onDialogBoxConfig: (config: DialogBoxConfig | null) => void;
}

//While typing: show “changed” state only
//on blur: show field-level error locally on that field
//on save with errors: escalate to banner-level summary
//while banner is visible: keep the summary live updated on blur
//once banner is cleared: don’t re-escalate again until the next save attempt

export function UsersSection({ onDialogBoxConfig }: UsersSectionProps) {
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [usersInfo, setUsersInfo] = useState<UsersSectionInfo>([]);
  const audioConfigInfo = useAudioConfigInfo();
  const [columnErrs, setColumnErrs] = useState<UsersSectionColumnErrs>({
    usernameErr: false,
    passwordErr: false,
    allowedPlsErr: false,
  });
  const { numPartylines: numPls } = audioConfigInfo;

  function handleUsersInfo(usersInfo: AdminUsersInfo): void {
    setUsersInfo((prevUsersInfo) => {
      const newInfo: UsersSectionInfo = [];
      usersInfo.forEach((userInfo, i) => {
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
    });
  }
  useUsersInfo(handleUsersInfo);

  function handleUsersLoggedIn(usersLoggedIn: AdminUsersLoggedInUpdate): void {
    setUsersInfo((prevUsersInfo) => {
      return prevUsersInfo.map((prevUserInfo, i) => {
        const user = usersLoggedIn[i];
        if (!user) {
          return prevUserInfo;
        }
        return { ...prevUserInfo, loggedIn: user.loggedIn };
      });
    });
  }
  useUsersLoggedIn(handleUsersLoggedIn);

  function handleInputChange(
    id: number,
    type: UsersSectionInputType,
    newValue: string,
  ): void {
    setUsersInfo((prevUsersInfo) => {
      const userInfo = prevUsersInfo[id];
      if (!userInfo) {
        log.error(`handleInputChange: No userInfo found for id ${id}`);
        return prevUsersInfo;
      }
      return prevUsersInfo.map((prevUserInfo, i) => {
        if (i !== id) {
          return prevUserInfo;
        }
        switch (type) {
          case "username":
            return { ...prevUserInfo, changedUsername: newValue };
          case "password":
            return { ...prevUserInfo, changedPassword: newValue };
          case "allowed-pls":
            return {
              ...prevUserInfo,
              changedAllowedPls: newValue,
            };
        }
      });
    });
  }

  function handleInputBlur(id: number, type: UsersSectionInputType): void {
    const { usersInfo: newUI, columnErrs: newCE } = calculateUsersErrs({
      id,
      type,
      usersInfo,
      columnErrs,
      numPls,
      preserveNoColumnErrs: true,
      logger: log,
    });
    setUsersInfo(newUI);
    setColumnErrs(newCE);
  }

  function handleSaveChanges(e: React.MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();
    const { usersInfo: calculatedUI, columnErrs: newCE } = calculateUsersErrs({
      id: null,
      usersInfo,
      columnErrs,
      numPls,
      logger: log,
    });
    let newUI = calculatedUI;
    if (Object.values(newCE).every((err) => err === false)) {
      sendUsersChangeRequest(newUI, numPls, log);
      newUI = normalizeUsersInfoAfterSave(newUI, numPls, log);
    }
    //Flush sync so that the blur happens after the state has been updated:
    flushSync(() => {
      setUsersInfo(newUI);
      setColumnErrs(newCE);
    });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  return (
    <div className={`users-section section${isHidden ? " hidden" : ""}`}>
      <h2
        className="users-section-title section-title"
        onClick={() => setIsHidden((h) => !h)}
      >
        Users: <span className="expanding-arrow closed">&#9660;</span>
        <span className="expanding-arrow open">&#9650;</span>
      </h2>
      <UsersSectionBanner columnErrs={columnErrs} numPls={numPls} />
      <form className="user-form form">
        <table className="user-form-table form-table">
          <thead>
            <tr>
              <th></th>
              <th>Username</th>
              <th>Password</th>
              <th>Allowed PLs</th>
              <th>User Logged In</th>
              <th></th>
              <th>
                <button
                  type="submit"
                  className="save-changes-btn btn"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="user-form-table-body">
            {usersInfo.map((userInfo) => (
              <UsersSectionRow
                key={userInfo.id}
                userInfo={userInfo}
                numPls={numPls}
                onInputChange={handleInputChange}
                onInputBlur={handleInputBlur}
                onDialogBoxConfig={onDialogBoxConfig}
              />
            ))}
          </tbody>
        </table>
      </form>
    </div>
  );
}
