import { dataIsObject, dataIsType } from "../helpers.js";

export interface PlNameInfo {
  id: number;
  name: string;
}

export function dataIsPlNameInfo(data: unknown): data is PlNameInfo {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.id) &&
    dataIsType("string", data.name)
  );
}

export function dataIsArrayOfPlNameInfos(data: unknown): data is PlNameInfo[] {
  return Array.isArray(data) && data.every((el) => dataIsPlNameInfo(el));
}
