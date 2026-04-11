import { dataIsObject, dataIsType } from "../helpers.js";

export interface AdminBannersInfo {
  audioLossDetected: boolean;
  soundcardDevicesErr: boolean;
}

export function dataIsAdminBannersInfo(
  data: unknown,
): data is AdminBannersInfo {
  return (
    dataIsObject(data) &&
    dataIsType("boolean", data.audioLossDetected) &&
    dataIsType("boolean", data.soundcardDevicesErr)
  );
}
