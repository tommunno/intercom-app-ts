import { dataIsObject, dataIsType } from "../helpers.js";
import { dataIsArrayOfLogRows, type LogRow } from "./LogRow.js";
import { dataIsLogsPosition, type LogsPosition } from "./LogsPosition.js";

export interface LogRowsInfo {
  logs: LogRow[] | null;
  position: LogsPosition;
}

export function dataIsLogRowsInfo(data: unknown): data is LogRowsInfo {
  return (
    dataIsObject(data) &&
    (dataIsArrayOfLogRows(data.logs) || dataIsType("null", data.logs)) &&
    dataIsLogsPosition(data.position)
  );
}
