import { dataIsObject } from "../helpers.js";

export interface AdminInputGainsInfo {}

//Add in validation here!:
export function dataIsAdminInputGainsInfo(
  data: unknown,
): data is AdminInputGainsInfo {
  return dataIsObject(data);
}
