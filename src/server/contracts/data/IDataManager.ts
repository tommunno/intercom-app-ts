import type {
  LogLevel,
  LogPageDirection,
  LogRow,
  LogRowsInfo,
} from "../../../shared/types/index.js";
import type {
  DataKey,
  DataPayloadMap,
  DownloadLogsOptions,
  DownloadLogsResult,
  NetworkPopulateData,
} from "../../types/index.js";

export interface DataManagerHandlers {
  onAdminLogUpdate: (latestLogs: LogRow[]) => void;
}

export interface GetLogsParams {
  direction: LogPageDirection;
  id: number;
}

export interface IDataManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: DataManagerHandlers) => void;

  saveData<K extends DataKey>(key: K, data: DataPayloadMap[K]): void;

  loadData<K extends DataKey>(
    key: K,
    fallback: DataPayloadMap[K],
  ): DataPayloadMap[K];

  getNetworkData: () => NetworkPopulateData;
  insertLog: (
    level: LogLevel,
    message: string,
    toAdminPanel: boolean,
    context: string,
  ) => void;
  getLogs: (params: GetLogsParams) => LogRowsInfo;
  getLatestLogs: () => LogRow[];
  downloadLogs: (options: DownloadLogsOptions) => DownloadLogsResult;
}
