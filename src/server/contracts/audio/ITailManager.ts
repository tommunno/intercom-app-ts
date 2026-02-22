import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type { TailState } from "../../../shared/types/TailState.js";
import type { KeyPressInfo } from "../../types/index.js";
import type { AudioMatrixConfig } from "./IAudioMatrixManager.js";

export interface TailHandlers {
  onKeyPress(userId: number, keyPressInfo: KeyPressInfo): void;
}

//TailManager shadows the AudioMatrixConfig:
export type TailConfig = AudioMatrixConfig;

export interface ITailManager {
  init: () => void;
  start: () => void;
  populate: (config: TailConfig) => void;
  stop: () => void;
  setHandlers: (handlers: TailHandlers) => void;
  getTailState: (userId: number, plId: number) => TailState;
  processKeyPress: (userId: number, keyPressInfo: KeyPressInfo) => void;
  status: ManagerStatus;
}
