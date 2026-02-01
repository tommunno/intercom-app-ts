import type { TailState } from "../../../shared/types/TailState.js";
import type { AudioConfig, KeyPressInfo } from "../../types/index.js";

export interface TailHandlers {
  onKeyPress(keyPressInfo: KeyPressInfo, userId: number): void;
}

export interface ITailManager {
  init: () => void;
  start: () => void;
  populate: (config: AudioConfig) => void;
  stop: () => void;
  setHandlers: (handlers: TailHandlers) => void;
  getTailState: (userId: number, plId: number) => TailState;
  processKeyPress: (keyPressInfo: KeyPressInfo, userId: number) => void;
}
