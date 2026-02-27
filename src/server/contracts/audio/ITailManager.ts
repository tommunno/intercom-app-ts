import type { KeyPressInfo } from "../../../shared/types/KeyPressInfo.js";
import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type { TailState } from "../../../shared/types/TailState.js";
import type { AudioMatrixConfig } from "./IAudioMatrixManager.js";

export interface TailHandlers {
  onKeyPress(portNum: number, keyPressInfo: KeyPressInfo): void;
  onUpdateAudioInfo(portNum: number): void;
  onIsSoleActiveTalkKeyForPort(portNum: number, plNum: number): boolean;
  onIsPortTalkingToPartyline(portNum: number, plNum: number): boolean;
}

//TailManager shadows the AudioMatrixConfig:
export type TailConfig = AudioMatrixConfig;

export interface ITailManager {
  init: () => void;
  start: () => void;
  populate: (config: TailConfig) => void;
  stop: () => void;
  setHandlers: (handlers: TailHandlers) => void;
  getTailState: (userId: number, plNum: number) => TailState;
  processKeyPress: (userId: number, keyPressInfo: KeyPressInfo) => void;
  status: ManagerStatus;
}
