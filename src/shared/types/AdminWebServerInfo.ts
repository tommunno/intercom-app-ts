import { dataIsObject } from "../helpers.js";

export interface AdminWebServerInfo {}

//Add in validation here!:
export function dataIsAdminWebServerInfo(
  data: unknown,
): data is AdminWebServerInfo {
  return dataIsObject(data);
}
