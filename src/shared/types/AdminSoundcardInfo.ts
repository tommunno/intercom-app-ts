import { dataIsObject } from "../helpers.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future additions
export interface AdminSoundcardInfo {}

//Add in validation here!:
export function dataIsAdminSoundcardInfo(
  data: unknown,
): data is AdminSoundcardInfo {
  return dataIsObject(data);
}
