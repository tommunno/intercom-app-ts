import type { PartylineInfo } from "../../../shared/types/index.js";
import type {
  AudioConfig,
  AudioMatrixPopulateData,
  KeyPressInfo,
} from "../../types/index.js";

export interface IAudioMatrixManager {
  init: () => void;
  populate: (data: AudioMatrixPopulateData) => AudioConfig;
  start: () => void;
  stop: () => void;
  getPartylineInfos: (userId: number) => PartylineInfo[] | null;
  processKeyPress: (userId: number, keyPressInfo: KeyPressInfo) => void;
}
