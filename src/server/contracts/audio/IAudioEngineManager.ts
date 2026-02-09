export interface AudioEngineHandlers {
}

export interface IAudioEngineManager {
  init: () => void;
  populate: () => void;
  start: () => void;
  setHandlers: (handlers: AudioEngineHandlers) => void;

}