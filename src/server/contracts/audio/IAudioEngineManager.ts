import type { AudioLogType } from "audio-engine";

export const AudioLogTypes = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
} as const satisfies Record<AudioLogType, AudioLogType>;

export interface AudioEngineConfig {
  numUsers: number;
  numSoundcardChannels: number;
  soundcardDeviceId: number;
}
export type AudioEnginePopulateConfig = Pick<AudioEngineConfig, "numUsers"> &
  Partial<Omit<AudioEngineConfig, "numUsers">>;

export interface AudioEngineHandlers {}

export interface IAudioEngineManager {
  init: () => void;
  populate: (config: AudioEnginePopulateConfig) => AudioEngineConfig;
  start: () => void;
  setHandlers: (handlers: AudioEngineHandlers) => void;
}
