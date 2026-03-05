import { dataIsObject } from "../helpers.js";

export interface AdminAudioConfigInfo {}

//Add in validation here!:
export function dataIsAdminAudioConfigInfo(
  data: unknown,
): data is AdminAudioConfigInfo {
  return dataIsObject(data);
}
