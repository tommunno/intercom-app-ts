import type { AudioInfo, PartylineInfo } from "../../../shared/types/index.js";
import type { AudioPopulateData, KeyPressInfo } from "../../types/index.js";

export interface AudioHandlers {
  onAudioInfoUpdate: (userId: number, audioInfo: AudioInfo) => void;
}

export interface IAudioController {
  init: () => void;
  populate: (data: AudioPopulateData) => void;
  start: () => void;
  setHandlers: (handlers: AudioHandlers) => void;

  connectUser: (userId: number, clientId: string) => boolean;
  disconnectUser: (userId: number) => boolean;
  getAudioInfo: (userId: number) => AudioInfo | null;
  processKeyPress: (userId: number, keyPressInfo: KeyPressInfo) => void;
  addRxTrack: (userId: number, track: any) => boolean;
  removeRxTrack: (userId: number) => boolean;
}
