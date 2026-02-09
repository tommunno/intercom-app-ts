//Still need to add types here:
export interface AudioEngine {
  createEngine: (
    numBufferedIo: number,
    soundcardNumInputChannels: number,
    soundcardNumOutputChannels: number,
    soundcardDeviceId: number,
  ) => void;
  getPortAudioDevices: () => any;
}

declare const engine: AudioEngine;
export = engine;
