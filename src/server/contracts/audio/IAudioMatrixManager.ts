import type {
  KeyPressInfo,
  ManagerStatus,
  PartylineInfo,
} from "../../../shared/types/index.js";
import type { CrosspointChange } from "../../types/index.js";
import type { PartylineSnapshot } from "./IPartyline.js";

export interface AudioMatrixConfig {
  numUsers: number;
  numSoundcardChannels: number;
  numPartylines: number;
}

export type AudioMatrixPopulateConfig = Omit<
  AudioMatrixConfig,
  "numPartylines"
> &
  Partial<Pick<AudioMatrixConfig, "numPartylines">>;

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
  processKeyPress: (portNum: number, keyPressInfo: KeyPressInfo) => void;
  //Is the specified port only talking to the specified partyline and no other partylines:
  isSoleActiveTalkKeyForPort: (portNum: number, plNum: number) => boolean;
  isPortTalkingToPartyline: (portNum: number, plNum: number) => boolean;
  //Is the specified port talking to any ports OTHER than the ones passed in:
  areAnyOtherTalkKeysActiveForPort: (
    portNum: number,
    plNums: ReadonlySet<number>,
  ) => boolean;
  status: ManagerStatus;
}
