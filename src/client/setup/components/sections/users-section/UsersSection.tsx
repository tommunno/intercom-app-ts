import { useReducer, useState } from "react";
import { flushSync } from "react-dom";
import { UsersSectionBanner } from "./UsersSectionBanner.jsx";
import { UsersSectionRow } from "./UsersSectionRow.jsx";
import logger from "../../../../shared/logging/logger.js";
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
  sendUsersChangeRequest,
  calculateUsersErrs,
} from "../../../helpers/index.js";
import { usersInfoReducer } from "../../../reducers/usersInfoReducer.js";

const log = logger.child({ context: "UsersSection" });

export type UsersSectionInputType = "username" | "password" | "allowed-pls";

export interface UsersSectionColumnErrs {
  usernameErr: boolean;
  passwordErr: boolean;
  allowedPlsErr: boolean;
  usernameClashesErr: boolean;
}

//While typing: show “changed” state only
//on blur: show banner-level summary for errors

export function UsersSection() {
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [usersInfo, usersInfoDispatch] = useReducer(usersInfoReducer, []);
  const audioConfigInfo = useAudioConfigInfo();
  const [columnErrs, setColumnErrs] = useState<UsersSectionColumnErrs>({
    usernameErr: false,
    passwordErr: false,
    allowedPlsErr: false,
    usernameClashesErr: false,
  });
  const { numPartylines: numPls } = audioConfigInfo;

  function handleUsersInfo(newUsersInfo: AdminUsersInfo): void {
    usersInfoDispatch({
      type: "new-server-data",
      serverData: newUsersInfo,
      numPls,
    });
  }
  useUsersInfo(handleUsersInfo);

  function handleUsersLoggedIn(usersLoggedIn: AdminUsersLoggedInUpdate): void {
    usersInfoDispatch({ type: "new-users-logged-in", usersLoggedIn });
  }
  useUsersLoggedIn(handleUsersLoggedIn);

  function handleInputChange(
    userId: number,
    inputType: UsersSectionInputType,
    newValue: string,
  ): void {
    usersInfoDispatch({ type: "new-input-value", inputType, userId, newValue });
  }

  function handleInputBlur(id: number, type: UsersSectionInputType): void {
    const { usersInfo: newUsersInfo, columnErrs: newCE } = calculateUsersErrs({
      id,
      type,
      usersInfo,
      columnErrs,
      numPls,
      logger: log,
    });
    usersInfoDispatch({ type: "replace-users-info", newUsersInfo });
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
    const areNoColumnErrs = Object.values(newCE).every((err) => !err);

    if (areNoColumnErrs) {
      sendUsersChangeRequest(calculatedUI, numPls, log);
    }

    //Flush sync so that the blur happens after the state has been updated:
    flushSync(() => {
      usersInfoDispatch({
        type: "replace-users-info",
        newUsersInfo: calculatedUI,
      });
      if (areNoColumnErrs) {
        usersInfoDispatch({ type: "normalize-after-save", numPls });
      }
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
              />
            ))}
          </tbody>
        </table>
      </form>
    </div>
  );
}
