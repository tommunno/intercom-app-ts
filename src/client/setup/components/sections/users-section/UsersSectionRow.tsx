import { useState } from "react";
import {
  createAllowedPlsSetOrNull,
  doAllowedPlsMatch,
  sanitizeUsername,
} from "../../../helpers/setupHelpers.js";
import type { UserSectionInfo } from "../../../types/UsersSectionInfo.js";
import type { UsersSectionInputType } from "./UsersSection.js";
import logger from "../../../../shared/logging/logger.js";
import setupWss from "../../../managers/setupWss.js";
import { useDialogBox } from "../../../hooks/index.js";

export interface UsersSectionRowProps {
  userInfo: UserSectionInfo;
  numPls: number;
  onInputChange: (
    id: number,
    type: UsersSectionInputType,
    newValue: string,
  ) => void;
  onInputBlur: (id: number, type: UsersSectionInputType) => void;
}

const log = logger.child({ context: "UsersSectionRow" });

export function UsersSectionRow({
  userInfo,
  numPls,
  onInputChange,
  onInputBlur,
}: UsersSectionRowProps) {
  const {
    id,
    username,
    changedUsername,
    usernameErr,
    changedPassword,
    passwordErr,
    allowedPls,
    changedAllowedPls,
    allowedPlsErr,
    loggedIn,
  } = userInfo;

  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [isEditingPassword, setIsEditingPassword] = useState<boolean>(false);
  const [isEditingAllowedPls, setIsEditingAllowedPls] =
    useState<boolean>(false);
  const { setDialogBoxConfig } = useDialogBox();

  const usernameChanged = sanitizeUsername(changedUsername) !== username;
  const passwordChanged = changedPassword.length > 0;
  const aPlsSetOrNull = createAllowedPlsSetOrNull(
    changedAllowedPls,
    numPls,
    log,
  );
  const allowedPlsChanged = aPlsSetOrNull
    ? !doAllowedPlsMatch(aPlsSetOrNull, allowedPls)
    : true;

  function handleLogOutUser(): void {
    setDialogBoxConfig({
      mainText: "Are you sure?",
      subText: "This will log the user out immediately.",
      confirmText: "Log Out User",
      onConfirm: () => {
        log.info(`Logging out user with id ${id}`);
        setupWss.send("ADMIN_USER_LOGOUT", { userId: id });
      },
    });
  }

  return (
    <tr>
      <td>
        <p className="row-number">{id + 1}</p>
      </td>
      <td>
        <input
          data-type="username"
          className={`username-input${usernameChanged && (!usernameErr || isEditingUsername) ? " input-changed" : ""}${!isEditingUsername && usernameErr ? " error" : ""}`}
          type="text"
          name="Username"
          autoComplete="username"
          value={changedUsername}
          onChange={(e) => onInputChange(id, "username", e.currentTarget.value)}
          onFocus={() => setIsEditingUsername(true)}
          onBlur={() => {
            setIsEditingUsername(false);
            onInputBlur(id, "username");
          }}
        />
      </td>
      <td>
        <input
          data-type="password"
          className={`password-input${passwordChanged && (!passwordErr || isEditingPassword) ? " input-changed" : ""}${!isEditingPassword && passwordErr ? " error" : ""}`}
          type="password"
          name="Password"
          autoComplete="off"
          placeholder="New password"
          value={changedPassword}
          onChange={(e) => onInputChange(id, "password", e.currentTarget.value)}
          onFocus={() => setIsEditingPassword(true)}
          onBlur={() => {
            setIsEditingPassword(false);
            onInputBlur(id, "password");
          }}
        />
      </td>
      <td>
        <input
          data-type="allowed-pls"
          className={`allowed-pls-input${allowedPlsChanged && (!allowedPlsErr || isEditingAllowedPls) ? " input-changed" : ""}${!isEditingAllowedPls && allowedPlsErr ? " error" : ""}`}
          type="text"
          name="Allowed PLs"
          autoComplete="none"
          placeholder="2, 4-6, 8"
          value={changedAllowedPls}
          onChange={(e) =>
            onInputChange(id, "allowed-pls", e.currentTarget.value)
          }
          onFocus={() => setIsEditingAllowedPls(true)}
          onBlur={() => {
            setIsEditingAllowedPls(false);
            onInputBlur(id, "allowed-pls");
          }}
        />
      </td>
      <td className="user-logged-in-setting-td">
        <input
          className={`user-logged-in-input${loggedIn ? " active" : ""}`}
          type="text"
          name="User Logged In"
          autoComplete="none"
          value={loggedIn ? "YES" : "NO"}
          disabled
        />
        <button
          type="button"
          className="log-out-user-btn btn"
          disabled={!loggedIn}
          onClick={handleLogOutUser}
        >
          Log Out User
        </button>
      </td>
    </tr>
  );
}
