import { dataIsObject } from "../helpers.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future additions
export interface AdminInputGainsInfo {}

//Add in validation here!:
export function dataIsAdminInputGainsInfo(
  data: unknown,
): data is AdminInputGainsInfo {
  return dataIsObject(data);
}
