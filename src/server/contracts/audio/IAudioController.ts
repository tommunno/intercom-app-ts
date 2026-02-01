import type { AudioInfo, PartylineInfo } from "../../../shared/types/index.js";
import type { AudioData, KeyPressInfo } from "../../types/index.js";

export interface AudioHandlers {
  onAudioInfoUpdate: (userId: number, audioInfo: AudioInfo) => void;
}

export interface IAudioController {
  init: () => void;
  populate: (data: AudioData) => void;
  start: () => void;
  setHandlers: (handlers: AudioHandlers) => void;

  connectUser: (userId: number, clientId: string) => boolean;
  disconnectUser: (userId: number) => boolean;
  getAudioInfo: (userId: number) => AudioInfo | null;
  processKeyPress: (keyPressInfo: KeyPressInfo, userId: number) => void;
}
