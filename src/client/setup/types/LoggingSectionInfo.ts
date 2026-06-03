import type { LogRow, LogRowsInfo } from "../../../shared/types/index.js";

export interface LoggingSectionInfo {
  latestLogs: LogRow[];
  requestedLogs: LogRowsInfo;
}
