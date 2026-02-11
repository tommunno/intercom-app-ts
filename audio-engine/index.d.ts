export interface PortAudioDevice {
  id: number;
  name: string;
  hostApiIndex: number;
  hostApiName: string;
  maxInputChannels: number;
  maxOutputChannels: number;
  defaultLowInputLatency: number;
  defaultLowOutputLatency: number;
  defaultHighInputLatency: number;
  defaultHighOutputLatency: number;
  defaultSampleRate: number;
  isDefaultInput: boolean;
  isDefaultOutput: boolean;
}

export type AudioCallback = (audioBuffer: Buffer) => void;

export interface LevelInfo {
  rmsDb: number;
  peakDb: number;
}

export type AudioLogType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export type AudioLogCallback = (
  message: string,
  type: AudioLogType,
  toAdminPanel: boolean,
) => void;

export interface AudioEngine {
  createEngine: (
    numBufferedIo: number,
    soundcardNumInputChannels: number,
    soundcardNumOutputChannels: number,
    soundcardDeviceId: number,
  ) => boolean;
  stopEngine: (terminatePortAudio: boolean) => boolean;
  getPortAudioDevices: () => PortAudioDevice[];
  routeToBufferedInput: (inputNumber: number, samples: Int16Array) => void;
  setBufferedInputRouted: (inputNumber: number, route: boolean) => boolean;
  isBufferedInputRouted: (inputNumber: number) => boolean;
  setInputGains: (gainsArray: number[]) => void;
  registerAudioCallback: (callback: AudioCallback) => number;
  unregisterAudioCallback: (callbackId: number) => boolean;
  updateMixerCrosspoint: (
    mixerId: number,
    channelIndex: number,
    state: boolean,
  ) => void;
  getInputLevelInfos: () => LevelInfo[];
  isSoundcardAlive: () => boolean;
  addLoggingCallback: (callback: AudioLogCallback) => void;
}

declare const engine: AudioEngine;
export = engine;
