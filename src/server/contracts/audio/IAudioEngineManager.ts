import type { AudioLogType } from "audio-engine";

export const AudioLogTypes = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
} as const satisfies Record<AudioLogType, AudioLogType>;

export interface AudioEngineHandlers {}

export interface IAudioEngineManager {
  init: () => void;
  populate: () => void;
  start: () => void;
  setHandlers: (handlers: AudioEngineHandlers) => void;
}
