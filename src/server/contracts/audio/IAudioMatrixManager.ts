import type {
  AdminAudioConfigInfo,
  AdminPartylinesChangeRequest,
  AdminPartylinesInfo,
  AdminUsersChangeRequest,
  KeyPressInfo,
  ManagerStatus,
  PartylineInfo,
} from "../../../shared/types/index.js";
import type {
  AllowedPlsInfo,
  AllowedPlsSetInfo,
  CrosspointChange,
  DisallowedPlsInfo,
} from "../../types/index.js";
import type { PartylineSnapshot } from "./IPartyline.js";

export interface AudioMatrixConfig {
  numUsers: number;
  numSoundcardChannels: number;
  numPartylines: number;
  allowedPlsInfos: AllowedPlsSetInfo[];
}

export interface AudioMatrixPopulateConfig {
  numUsers: number;
  numSoundcardChannels: number;
  numPartylines?: number;
  allowedPlsInfos?: AllowedPlsInfo[];
}

export interface AudioMatrixSnapshot {
  partylineSnapshots: PartylineSnapshot[];
}

export interface AudioMatrixStopResult {
  config: AudioMatrixConfig;
  snapshot: AudioMatrixSnapshot | null;
}

export interface AudioMatrixHandlers {
  onCrosspointChange: (crosspointChange: CrosspointChange) => void;
}

export type AudioAdminUsersChangeRequestResult =
  | {
      success: true;
      userIdsToUpdate: number[];
      disallowedPlsInfos: DisallowedPlsInfo[];
    }
  | {
      success: false;
      message: string;
      userIdsToUpdate: number[];
      disallowedPlsInfos: DisallowedPlsInfo[];
    };

export type AudioAdminPartylinesChangeRequestResult =
  | {
      success: true;
    }
  | { success: false; message: string };

export interface IAudioMatrixManager {
  init: () => void;
  populate: (
    config: AudioMatrixPopulateConfig,
    snapshot: AudioMatrixSnapshot | null,
  ) => AudioMatrixConfig;
  start: () => void;
  stop: () => AudioMatrixStopResult;
  setHandlers: (handlers: AudioMatrixHandlers) => void;
  getPartylineInfos: (userId: number) => PartylineInfo[] | null;
  getAllowedPlsInfos: () => AllowedPlsInfo[];
  isPlAllowedForPortNum: (portNum: number, plNum: number) => boolean;
  processKeyPress: (portNum: number, keyPressInfo: KeyPressInfo) => void;
  //Is the specified port only talking to the specified partyline and no other partylines:
  isSoleActiveTalkKeyForPort: (portNum: number, plNum: number) => boolean;
  isPortTalkingToPartyline: (portNum: number, plNum: number) => boolean;
  //Is the specified port talking to any partylines OTHER than the ones passed in:
  areAnyOtherTalkKeysActiveForPort: (
    portNum: number,
    plNums: ReadonlySet<number>,
  ) => boolean;
  getAdminPartylinesInfo: () => AdminPartylinesInfo;
  getAdminAudioConfigInfo: () => AdminAudioConfigInfo;
  processAdminUsersChangeRequest: (
    changeRequest: AdminUsersChangeRequest,
  ) => AudioAdminUsersChangeRequestResult;
  processAdminPartylinesChangeRequest: (
    changeRequest: AdminPartylinesChangeRequest,
  ) => AudioAdminPartylinesChangeRequestResult;
  status: ManagerStatus;
  config: AudioMatrixConfig;
}
