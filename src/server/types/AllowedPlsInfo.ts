import { dataIsObject, dataIsType } from "../../shared/helpers.js";

export interface AllowedPlsSetInfo {
  userId: number;
  allowedPls: Set<number>;
}

export interface AllowedPlsInfo {
  userId: number;
  allowedPls: number[];
}

export function dataIsAllowedPlsInfo(data: unknown): data is AllowedPlsInfo {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.userId) &&
    Array.isArray(data.allowedPls) &&
    data.allowedPls.every((el) => dataIsType("safeIntegerNum", el))
  );
}

export function dataIsArrayOfAllowedPlsInfos(
  data: unknown,
): data is AllowedPlsInfo[] {
  return Array.isArray(data) && data.every((el) => dataIsAllowedPlsInfo(el));
}
