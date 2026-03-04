import type {
  AudioInfo,
  KEY_TYPE,
  KeyState,
  TailState,
  UserInfo,
} from "../../shared/types/index.js";
import type { DisplayPopupParams, PanelState } from "../types/index.js";

export type KeyPressParams =
  | {
      type: typeof KEY_TYPE.TALK;
      id: number;
      currState: KeyState;
      tailState: TailState;
    }
  | { type: typeof KEY_TYPE.LISTEN; id: number; currState: KeyState };

export interface PanelGlobalGuiManagerHandlers {
  onLogoutBtnClick(): void;
  onKeyPress(params: KeyPressParams): void;
}

export interface IPanelGlobalGuiManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: PanelGlobalGuiManagerHandlers) => void;
  displayState: (state: PanelState) => void;
  displayUserInfo: (userInfo: UserInfo) => void;
  displayAudioInfo: (audioInfo: AudioInfo) => void;
  displayPopup: (params: DisplayPopupParams) => void;
  hidePopup: () => void;
  setErrorModal: (visible: boolean) => void;
}
