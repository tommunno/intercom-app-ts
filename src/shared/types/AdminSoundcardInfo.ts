import { dataIsObject } from "../helpers.js";

export interface AdminSoundcardInfo {}

//Add in validation here!:
export function dataIsAdminSoundcardInfo(
  data: unknown,
): data is AdminSoundcardInfo {
  return dataIsObject(data);
}
