import { dataIsObject } from "../helpers.js";

export interface AdminLoggingInfo {}

//Add in validation here!:
export function dataIsAdminLoggingInfo(
  data: unknown,
): data is AdminLoggingInfo {
  return dataIsObject(data);
}
