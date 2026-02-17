import type { PartylineInfo } from "../../../shared/types/index.js";
import type { CrosspointChange, KeyPressInfo } from "../../types/index.js";

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

export interface AudioMatrixHandlers {
  onCrosspointChange: (crosspointChange: CrosspointChange) => void;
}

export interface IAudioMatrixManager {
  init: () => void;
  populate: (config: AudioMatrixPopulateConfig) => AudioMatrixConfig;
  start: () => void;
  stop: () => void;
  setHandlers: (handlers: AudioMatrixHandlers) => void;
  getPartylineInfos: (userId: number) => PartylineInfo[] | null;
  processKeyPress: (portNum: number, keyPressInfo: KeyPressInfo) => void;
}
