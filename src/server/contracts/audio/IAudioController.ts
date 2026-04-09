import type {
  AdminAudioConfigInfo,
  AdminInputGainsInfo,
  AdminPartylinesChangeRequest,
  AdminPartylinesInfo,
  AdminSoundcardsInfo,
  AdminUsersChangeRequest,
  AudioInfo,
  KeyPressInfo,
} from "../../../shared/types/index.js";
import type {
  AllowedPlsInfo,
  AudioPopulateData,
  DisallowedPlsInfo,
  RtcMediaStreamTrack,
  TrackAndStream,
} from "../../types/index.js";
import type {
  AudioAdminPartylinesChangeRequestResult,
  AudioAdminUsersChangeRequestResult,
} from "./IAudioMatrixManager.js";

export interface AudioAdminInfos {
  inputGainsInfo: AdminInputGainsInfo;
  partylinesInfo: AdminPartylinesInfo;
  soundcardsInfo: AdminSoundcardsInfo;
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
  getAllowedPlsInfos: () => AllowedPlsInfo[];
  processKeyPress: (userId: number, keyPressInfo: KeyPressInfo) => void;
  addRxTrack: (userId: number, track: RtcMediaStreamTrack) => boolean;
  removeRxTrack: (userId: number) => boolean;
  getTxTrackAndStream: (userId: number) => TrackAndStream | null;
  setRequestedSoundcardId: (id: number) => boolean;
  processDisallowedPlsInfos: (infos: DisallowedPlsInfo[]) => void;

  getAdminInfos: () => AudioAdminInfos;
  getAdminSoundcardsInfo: () => AdminSoundcardsInfo;
  getAdminPartylinesInfo: () => AdminPartylinesInfo;
  processAdminUsersChangeRequest: (
    changeRequest: AdminUsersChangeRequest,
  ) => AudioAdminUsersChangeRequestResult;
  processAdminPartylinesChangeRequest: (
    changeRequest: AdminPartylinesChangeRequest,
  ) => AudioAdminPartylinesChangeRequestResult;
}
