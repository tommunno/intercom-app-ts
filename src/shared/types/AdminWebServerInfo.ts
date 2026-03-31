import { dataIsObject } from "../helpers.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future additions
export interface AdminWebServerInfo {}

//Add in validation here!:
export function dataIsAdminWebServerInfo(
  data: unknown,
): data is AdminWebServerInfo {
  return dataIsObject(data);
}
