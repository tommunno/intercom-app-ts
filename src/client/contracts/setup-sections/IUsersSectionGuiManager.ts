import type {
  AdminUsersChangeRequest,
  AdminUsersLoggedInUpdate,
} from "../../../shared/types/index.js";
import type { ISetupSectionGuiManager } from "./ISetupSectionGuiManager.js";

export interface UsersSectionGuiManagerHandlers {
  onUpdate: (changeRequest: AdminUsersChangeRequest) => void;
}

export interface IUsersSectionGuiManager extends ISetupSectionGuiManager {
  setHandlers: (handlers: UsersSectionGuiManagerHandlers) => void;
  displayUsersLoggedInUpdate: (update: AdminUsersLoggedInUpdate) => void;
}
