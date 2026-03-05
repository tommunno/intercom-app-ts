import type {
  AdminAudioConfigInfo,
  AdminInputGainsInfo,
  AdminPartylinesInfo,
  AdminSoundcardInfo,
  AudioInfo,
  KeyPressInfo,
} from "../../../shared/types/index.js";
import type {
  AudioPopulateData,
  RtcMediaStreamTrack,
  TrackAndStream,
} from "../../types/index.js";

export interface AudioAdminInfos {
  inputGainsInfo: AdminInputGainsInfo;
  partylinesInfo: AdminPartylinesInfo;
  soundcardInfo: AdminSoundcardInfo;
  audioConfigInfo: AdminAudioConfigInfo;
}

export interface AudioHandlers {
  onAudioInfoUpdate: (userId: number, audioInfo: AudioInfo) => void;
  onAudioRestart: () => void;
}

export interface IAudioController {
  init: () => void;
  populate: (data: AudioPopulateData) => void;
  start: () => void;
  setHandlers: (handlers: AudioHandlers) => void;

  getAudioInfo: (userId: number) => AudioInfo | null;
  processKeyPress: (userId: number, keyPressInfo: KeyPressInfo) => void;
  addRxTrack: (userId: number, track: RtcMediaStreamTrack) => boolean;
  removeRxTrack: (userId: number) => boolean;
  getTxTrackAndStream: (userId: number) => TrackAndStream | null;
  setRequestedSoundcardId: (id: number) => boolean;

  getAdminInfos: () => AudioAdminInfos;
}
