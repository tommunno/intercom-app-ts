import type {
  KeyType,
  KeyPressInfo,
  ManagerStatus,
  TailState,
} from "../../../shared/types/index.js";
import type { DisallowedPlsInfo } from "../../types/index.js";
import type { TailInfo } from "../../types/index.js";
import type { AudioMatrixConfig } from "./IAudioMatrixManager.js";

export interface TailHandlers {
  onKeyPress(portNum: number, keyPressInfo: KeyPressInfo): void;
  onUpdateAudioInfo(portNum: number): void;
  onIsSoleActiveTalkKeyForPort(portNum: number, plNum: number): boolean;
  onIsPortInPartyline(portNum: number, plNum: number, type: KeyType): boolean;
  onAreAnyOtherTalkKeysActiveForPort(
    portNum: number,
    plNums: ReadonlySet<number>,
  ): boolean;
  onIsPlAllowedForPortNum(portNum: number, plNum: number): boolean;
}

//TailManager shadows the AudioMatrixConfig, but will ask the AudioMatrixManager about the allowedPlsInfos whenever it needs to know, because allowedPlsInfos changes dynamically
export type TailConfig = Omit<AudioMatrixConfig, "allowedPlsInfos">;

//An array of TailInfos for each port. A TailInfo for each partyline:
export type TailSnapshot = TailInfo[][];

export interface ITailManager {
  init: () => void;
  start: () => void;
  populate: (config: TailConfig) => void;
  stop: () => TailSnapshot;
  setHandlers: (handlers: TailHandlers) => void;
  getTailState: (userId: number, plNum: number) => TailState;
  processKeyPress: (
    userId: number,
    keyPressInfo: KeyPressInfo,
    force?: boolean,
  ) => void;
  status: ManagerStatus;
  processDisallowedPlsInfos: (infos: DisallowedPlsInfo[]) => void;
}
