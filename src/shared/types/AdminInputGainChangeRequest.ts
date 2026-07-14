import { dataIsObject, dataIsType } from "../helpers.js";

export interface AdminInputGainChangeRequest {
  id: number;
  gain: number;
}

export function dataIsAdminInputGainChangeRequest(
  data: unknown,
): data is AdminInputGainChangeRequest {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.id) &&
    dataIsType("safeIntegerNum", data.gain)
  );
}
