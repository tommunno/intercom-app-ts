import { dataIsObject, dataIsType } from "../helpers.js";

export interface AdminAudioConfigInfo {
  numUsers: number;
  numPartylines: number;
}

export function dataIsAdminAudioConfigInfo(
  data: unknown,
): data is AdminAudioConfigInfo {
  return (
    dataIsObject(data) &&
    dataIsType("number", data.numUsers) &&
    dataIsType("number", data.numPartylines)
  );
}
