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

export interface AudioEngineHandlers {}

export interface IAudioEngineManager {
  init: () => void;
  populate: (config: AudioEnginePopulateConfig) => AudioEngineConfig;
  start: () => void;
  setHandlers: (handlers: AudioEngineHandlers) => void;
}
