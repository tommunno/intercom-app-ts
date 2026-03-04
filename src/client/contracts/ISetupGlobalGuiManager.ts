import type { DisplayPopupParams, SetupState } from "../types/index.js";

export interface SetupGlobalGuiManagerHandlers {
  onLogoutBtnClick(): void;
}

export interface ISetupGlobalGuiManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: SetupGlobalGuiManagerHandlers) => void;
  displayState: (state: SetupState) => void;
  setErrorModal: (visible: boolean) => void;
}
