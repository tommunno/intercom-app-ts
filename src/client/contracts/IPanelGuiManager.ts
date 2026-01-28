import type {
  AudioInfo,
  KEY_TYPE,
  KeyState,
  TailState,
  UserInfo,
} from "../../shared/types/index.js";
import { type PanelState } from "../types/index.js";

export type KeyPressParams =
  | {
      type: typeof KEY_TYPE.TALK;
      id: number;
      currState: KeyState;
      tailState: TailState;
    }
  | { type: typeof KEY_TYPE.LISTEN; id: number; currState: KeyState };

export interface PanelGuiManagerHandlers {
  onLoginAttempt(username: string, password: string): void;
  onLogoutBtnClick(): void;
  onKeyPress(params: KeyPressParams): void;
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
  setErrorModal: (visible: boolean) => void;
}
