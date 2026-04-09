import { dataIsObject, dataIsType, dataIsTypeAOrB } from "../helpers.js";

export interface AdminPartylineChangeRequest {
  plId: number;
  plName: string | null;
}

export type AdminPartylinesChangeRequest = AdminPartylineChangeRequest[];

export function dataIsAdminPartylineChangeRequest(
  data: unknown,
): data is AdminPartylineChangeRequest {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.plId) &&
    dataIsTypeAOrB("string", "null", data.plName)
  );
}

export function dataIsAdminPartylinesChangeRequest(
  data: unknown,
): data is AdminPartylinesChangeRequest {
  return Array.isArray(data) && data.every(dataIsAdminPartylineChangeRequest);
}
