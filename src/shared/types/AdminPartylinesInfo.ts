import { dataIsObject, dataIsType } from "../helpers.js";

export interface AdminPartylineInfo {
  id: number;
  name: string;
}

export type AdminPartylinesInfo = AdminPartylineInfo[];

export function dataIsAdminPartylineInfo(
  data: unknown,
): data is AdminPartylineInfo {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.id) &&
    dataIsType("string", data.name)
  );
}

export function dataIsAdminPartylinesInfo(
  data: unknown,
): data is AdminPartylinesInfo {
  return Array.isArray(data) && data.every(dataIsAdminPartylineInfo);
}
