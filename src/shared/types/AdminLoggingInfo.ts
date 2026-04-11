import { dataIsObject } from "../helpers.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future additions
export interface AdminLoggingInfo {}

//Add in validation here!:
export function dataIsAdminLoggingInfo(
  data: unknown,
): data is AdminLoggingInfo {
  return dataIsObject(data);
}
