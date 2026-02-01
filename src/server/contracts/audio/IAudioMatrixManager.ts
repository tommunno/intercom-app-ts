import type { PartylineInfo } from "../../../shared/types/index.js";
import type {
  AudioConfig,
  AudioData,
  AudioMatrixData,
  KeyPressInfo,
} from "../../types/index.js";

export interface IAudioMatrixManager {
  init: () => void;
  populate: (data: AudioMatrixData) => AudioConfig;
  start: () => void;
  stop: () => void;
  getPartylineInfos: (userId: number) => PartylineInfo[] | null;
  processKeyPress: (keyPressInfo: KeyPressInfo, userId: number) => void;
}
