import { dataIsObject } from "../helpers.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future additions
export interface AdminAudioConfigInfo {}

//Add in validation here!:
export function dataIsAdminAudioConfigInfo(
  data: unknown,
): data is AdminAudioConfigInfo {
  return dataIsObject(data);
}
