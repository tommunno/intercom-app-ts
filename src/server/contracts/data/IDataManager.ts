import type { AccountData } from "../../types/AccountData.js";
import type { AudioData } from "../../types/AudioData.js";
import type { NetworkData } from "../../types/NetworkData.js";

export interface DataManagerHandlers {}

export interface IDataManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: DataManagerHandlers) => void;

  getAccountData: () => AccountData;
  getNetworkData: () => NetworkData;
  getAudioData: () => AudioData;
}
