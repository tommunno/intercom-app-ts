import type { PartylineInfo } from "../../../shared/types/index.js";
import type { KeyPressInfo } from "../../types/index.js";

export interface AudioMatrixConfig {
  numUsers: number;
  numSoundcardChannels: number;
  numPartylines: number;
}

export type AudioMatrixPopulateConfig = Omit<
  AudioMatrixConfig,
  "numPartylines"
> &
  Partial<Pick<AudioMatrixConfig, "numPartylines">>;

export interface IAudioMatrixManager {
  init: () => void;
  populate: (config: AudioMatrixPopulateConfig) => AudioMatrixConfig;
  start: () => void;
  stop: () => void;
  getPartylineInfos: (userId: number) => PartylineInfo[] | null;
  processKeyPress: (userId: number, keyPressInfo: KeyPressInfo) => void;
}
