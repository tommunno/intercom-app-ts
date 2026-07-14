import type {
  AdminAudioConfigInfo,
  AdminInputGainChangeRequest,
  AdminInputGainsInfo,
  AdminPartylinesChangeRequest,
  AdminPartylinesInfo,
  AdminUsersChangeRequest,
  AllResolvedAPls,
  KeyPressInfo,
  KeyType,
  ManagerStatus,
  PartylineInfo,
  PlNameInfo,
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
  plNames?: PlNameInfo[];
}

export interface AudioMatrixSnapshot {
  partylineSnapshots: PartylineSnapshot[];
}

export interface AudioMatrixStopResult {
  config: AudioMatrixConfig;
  snapshot: AudioMatrixSnapshot | null;
}

export interface AudioMatrixSaveSnapshot {
  numPartylines?: number;
  allowedPlsInfos?: AllowedPlsInfo[];
  plNames?: PlNameInfo[];
}

export interface AudioMatrixHandlers {
  onCrosspointChange: (crosspointChange: CrosspointChange) => void;
  onInputGainsChange: (gains: number[]) => boolean;
}

export type AudioAdminUsersValidationResult =
  | { success: true; allResolvedAPls: AllResolvedAPls }
  | { success: false; errors: Set<string> };

export type AudioAdminUsersApplyResult = {
  userIdsToUpdate: number[];
  disallowedPlsInfos: DisallowedPlsInfo[];
};

export type AudioAdminPartylinesProcessResult =
  | {
      success: true;
    }
  | { success: false; message: string };

export type AudioAdminInputGainChangeResult =
  | { success: true }
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
  isPortInPartyline: (portNum: number, plNum: number, type: KeyType) => boolean;
  //Is the specified port talking to any partylines OTHER than the ones passed in:
  areAnyOtherTalkKeysActiveForPort: (
    portNum: number,
    plNums: ReadonlySet<number>,
  ) => boolean;
  getAdminPartylinesInfo: () => AdminPartylinesInfo;
  getAdminAudioConfigInfo: () => AdminAudioConfigInfo;
  validateAdminUsersChangeRequest: (
    request: AdminUsersChangeRequest,
  ) => AudioAdminUsersValidationResult;
  applyAdminUsersChangeRequest: (
    allResolvedAPls: AllResolvedAPls,
  ) => AudioAdminUsersApplyResult;
  processAdminPartylinesChangeRequest: (
    request: AdminPartylinesChangeRequest,
  ) => AudioAdminPartylinesProcessResult;
  processAdminInputGainChangeRequest: (
    request: AdminInputGainChangeRequest,
  ) => AudioAdminInputGainChangeResult;
  getAdminInputGainsInfo: () => AdminInputGainsInfo;
  getSaveSnapshot: () => AudioMatrixSaveSnapshot | null;

  status: ManagerStatus;
  config: AudioMatrixConfig;
}
