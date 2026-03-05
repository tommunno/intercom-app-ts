import type { AdminUsersInfo } from "../../../shared/types/AdminUsersInfo.js";
import type { ISetupSectionGuiManager } from "./ISetupSectionGuiManager.js";

export interface UsersSectionGuiManagerHandlers {}

export interface IUsersSectionGuiManager extends ISetupSectionGuiManager {
  setHandlers: (handlers: UsersSectionGuiManagerHandlers) => void;
  displayUsersInfo: (usersInfo: AdminUsersInfo) => void;
}
