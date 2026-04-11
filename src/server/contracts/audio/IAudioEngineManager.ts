import type {
  AdminInputGainsInfo,
  AdminSoundcardsInfo,
  ManagerStatus,
} from "../../../shared/types/index.js";
import type { CrosspointChange } from "../../types/index.js";
import type { AudioLogType } from "audio-engine";

export const AudioLogTypes = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
} as const satisfies Record<AudioLogType, AudioLogType>;

export interface AudioEngineConfig {
  numUsers: number;
  requestedNumSoundcardChannels: number;
  requestedSoundcardId: number | null;
  numSoundcardChannels: number;
  numTotalChannels: number;
  soundcardId: number;
  isReady: boolean;
}

export interface AudioEnginePopulateConfig {
  numUsers: number;
  requestedNumSoundcardChannels?: number;
  requestedSoundcardId?: number;
}

export type DeviceValidResponse =
  | { valid: true }
  | { valid: false; errMessage: string };

export interface AudioEngineHandlers {
  onAudio: (buffer: Buffer) => void;
  onAudioLossDetectedChange: (lossDetected: boolean) => void;
}

export interface IAudioEngineManager {
  init: () => void;
  populate: (config: AudioEnginePopulateConfig) => AudioEngineConfig;
  start: () => void;
  stop: () => AudioEngineConfig;
  setHandlers: (handlers: AudioEngineHandlers) => void;
  setChannelRouted: (channelNum: number, routed: boolean) => boolean;
  pushAudio: (channelNum: number, samples: Int16Array) => void;
  updateCrosspoint: (crosspointChange: CrosspointChange) => boolean;
  getAdminInputGainsInfo: () => AdminInputGainsInfo;
  getAdminSoundcardsInfo: () => AdminSoundcardsInfo;
  status: ManagerStatus;
  config: AudioEngineConfig;
  getAdminAudioBannersInfo: () => {
    audioLossDetected: boolean;
    soundcardDevicesErr: boolean;
  };
}
