import { dataIsObject, dataIsType } from "../helpers.js";
import { dataIsLogLevel, type LogLevel } from "./LogLevel.js";

export type LogRow = {
  id: number;
  level: LogLevel;
  message: string;
  context: string;
  createdAt: number;
};

export function dataIsLogRow(data: unknown): data is LogRow {
  return (
    dataIsObject(data) &&
    dataIsType("number", data.id) &&
    dataIsLogLevel(data.level) &&
    dataIsType("string", data.message) &&
    dataIsType("string", data.context) &&
    dataIsType("number", data.createdAt)
  );
}

export function dataIsArrayOfLogRows(data: unknown): data is LogRow[] {
  return Array.isArray(data) && data.every((el) => dataIsLogRow(el));
}
