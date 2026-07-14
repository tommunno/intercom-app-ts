import { dataIsObject, dataIsType } from "../helpers.js";
import { dataIsMatrixPortType, type MatrixPortType } from "./MatrixPortType.js";

export interface AdminInputGainInfo {
  id: number;
  gain: number;
  type: MatrixPortType;
}

export type AdminInputGainsInfo = AdminInputGainInfo[];

export function dataIsAdminInputGainInfo(
  data: unknown,
): data is AdminInputGainsInfo {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.id) &&
    dataIsType("safeIntegerNum", data.gain) &&
    dataIsMatrixPortType(data.type)
  );
}

export function dataIsAdminInputGainsInfo(
  data: unknown,
): data is AdminInputGainsInfo {
  return Array.isArray(data) && data.every(dataIsAdminInputGainInfo);
}
