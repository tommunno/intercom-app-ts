import type { AudioInfo, UserInfo } from "../../shared/types/index.js";
import type { PanelState } from "../types/index.js";

export interface PanelGuiManagerHandlers {
  onLoginAttempt(username: string, password: string): void;
}

export interface IPanelGuiManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: PanelGuiManagerHandlers) => void;
  setLoginError: (errMessage: string | null) => void;
  setLoginLoading: (isLoading: boolean) => void;
  setLoginVisible: (isVisible: boolean) => void;
  displayState: (state: PanelState) => void;
  displayUserInfo: (userInfo: UserInfo) => void;
  displayAudioInfo: (audioInfo: AudioInfo) => void;
}
