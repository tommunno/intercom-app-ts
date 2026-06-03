import { dataIsObject, dataIsType } from "../helpers.js";
import { dataIsArrayOfLogRows, type LogRow } from "./LogRow.js";
import { dataIsLogRowsInfo, type LogRowsInfo } from "./LogRowsInfo.js";

export interface AdminLoggingInfo {
  latestLogs: LogRow[];
  requestedLogs?: LogRowsInfo;
}

export function dataIsAdminLoggingInfo(
  data: unknown,
): data is AdminLoggingInfo {
  return (
    dataIsObject(data) &&
    dataIsArrayOfLogRows(data.latestLogs) &&
    (dataIsLogRowsInfo(data.requestedLogs) ||
      dataIsType("undefined", data.requestedLogs))
  );
}
