import type {
  AdminAudioConfigInfo,
  AdminInputGainsInfo,
  AdminPartylinesChangeRequest,
  AdminPartylinesInfo,
  AdminSoundcardsInfo,
  AdminUsersChangeRequest,
  AllResolvedAPls,
  AudioInfo,
  KeyPressInfo,
} from "../../../shared/types/index.js";
import type {
  AllowedPlsInfo,
  AudioData,
  AudioPopulateData,
  DisallowedPlsInfo,
  RtcMediaStreamTrack,
  TrackAndStream,
} from "../../types/index.js";
import type {
  AudioAdminPartylinesProcessResult,
  AudioAdminUsersApplyResult,
  AudioAdminUsersValidationResult,
} from "./IAudioMatrixManager.js";

export interface AudioAdminInfos {
  inputGainsInfo: AdminInputGainsInfo;
  partylinesInfo: AdminPartylinesInfo;
  soundcardsInfo: AdminSoundcardsInfo;
  audioConfigInfo: AdminAudioConfigInfo;
  audioBannersInfo: {
    audioLossDetected: boolean;
    soundcardDevicesErr: boolean;
  };
}

export interface AudioHandlers {
  onAudioInfoUpdate: (userId: number, audioInfo: AudioInfo) => void;
  onAudioRestart: () => void;
  onAudioLossDetectedChange: () => void;
}

export interface IAudioController {
  init: () => void;
  populate: (data: AudioPopulateData) => void;
  start: () => void;
  setHandlers: (handlers: AudioHandlers) => void;

  getSaveSnapshot: () => AudioData | null;

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
  getAdminAudioBannersInfo: () => {
    audioLossDetected: boolean;
    soundcardDevicesErr: boolean;
  };
  validateAdminUsersChangeRequest: (
    request: AdminUsersChangeRequest,
  ) => AudioAdminUsersValidationResult;
  applyAdminUsersChangeRequest: (
    allResolvedAPls: AllResolvedAPls,
  ) => AudioAdminUsersApplyResult;
  processAdminPartylinesChangeRequest: (
    request: AdminPartylinesChangeRequest,
  ) => AudioAdminPartylinesProcessResult;
}
