import type { AccountData } from "../../types/AccountData.js";
import type { AdminAccountData } from "../../types/AdminAccountData.js";
import type { AudioData } from "../../types/AudioData.js";
import type { NetworkData } from "../../types/NetworkData.js";

export interface DataManagerHandlers {}

export interface IDataManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: DataManagerHandlers) => void;

  getAccountData: () => AccountData;
  getAdminAccountData: () => AdminAccountData;
  getNetworkData: () => NetworkData;
  getAudioData: () => AudioData;
}
