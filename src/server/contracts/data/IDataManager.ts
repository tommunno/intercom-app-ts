// import type { AccountData } from "../../types/AccountData.js";
// import type { AdminAccountData } from "../../types/AdminAccountData.js";
// import type { AudioData } from "../../types/AudioData.js";
// import type { NetworkData } from "../../types/NetworkData.js";
import type { DataKey, DataPayloadMap } from "../../types/databaseTypes.js";
import type { NetworkPopulateData } from "../../types/NetworkData.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future handlers
export interface DataManagerHandlers {}

export interface IDataManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: DataManagerHandlers) => void;

  // getAccountData: () => AccountData;
  // getAdminAccountData: () => AdminAccountData;
  // getNetworkData: () => NetworkData;
  // getAudioData: () => AudioData;

  saveData<K extends DataKey>(key: K, data: DataPayloadMap[K]): void;

  loadData<K extends DataKey>(
    key: K,
    fallback: DataPayloadMap[K],
  ): DataPayloadMap[K];

  getNetworkData: () => NetworkPopulateData;
}
