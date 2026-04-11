import { dataIsObject } from "../helpers.js";
import {
  dataIsAdminAudioConfigInfo,
  type AdminAudioConfigInfo,
} from "./AdminAudioConfigInfo.js";
import {
  dataIsAdminBannersInfo,
  type AdminBannersInfo,
} from "./AdminBannersInfo.js";
import {
  dataIsAdminInputGainsInfo,
  type AdminInputGainsInfo,
} from "./AdminInputGainsInfo.js";
import {
  dataIsAdminLoggingInfo,
  type AdminLoggingInfo,
} from "./AdminLoggingInfo.js";
import {
  dataIsAdminPartylinesInfo,
  type AdminPartylinesInfo,
} from "./AdminPartylinesInfo.js";
import {
  dataIsAdminSoundcardsInfo,
  type AdminSoundcardsInfo,
} from "./AdminSoundcardsInfo.js";
import { dataIsAdminUsersInfo, type AdminUsersInfo } from "./AdminUsersInfo.js";
import {
  dataIsAdminWebServerInfo,
  type AdminWebServerInfo,
} from "./AdminWebServerInfo.js";

//Sent on admin login, everything required:
export interface AdminSnapshot {
  webServerInfo: AdminWebServerInfo;
  inputGainsInfo: AdminInputGainsInfo;
  usersInfo: AdminUsersInfo;
  partylinesInfo: AdminPartylinesInfo;
  soundcardsInfo: AdminSoundcardsInfo;
  audioConfigInfo: AdminAudioConfigInfo;
  loggingInfo: AdminLoggingInfo;
  bannersInfo: AdminBannersInfo;
}

//Sent on updates, everything optional:
export type AdminUpdate = Partial<AdminSnapshot>;

const ADMIN_SNAPSHOT_VALIDATORS: Record<
  keyof AdminSnapshot,
  (x: unknown) => boolean
> = {
  webServerInfo: dataIsAdminWebServerInfo,
  inputGainsInfo: dataIsAdminInputGainsInfo,
  usersInfo: dataIsAdminUsersInfo,
  partylinesInfo: dataIsAdminPartylinesInfo,
  soundcardsInfo: dataIsAdminSoundcardsInfo,
  audioConfigInfo: dataIsAdminAudioConfigInfo,
  loggingInfo: dataIsAdminLoggingInfo,
  bannersInfo: dataIsAdminBannersInfo,
};

export function dataIsAdminSnapshot(data: unknown): data is AdminSnapshot {
  if (!dataIsObject(data)) return false;

  for (const [key, validator] of Object.entries(ADMIN_SNAPSHOT_VALIDATORS)) {
    if (!(key in data)) return false;
    if (!validator(data[key])) return false;
  }

  return true;
}

export function dataIsAdminUpdate(data: unknown): data is AdminUpdate {
  if (!dataIsObject(data)) return false;

  // Validate only present keys
  for (const [key, validator] of Object.entries(ADMIN_SNAPSHOT_VALIDATORS)) {
    if (key in data && !validator(data[key])) {
      return false;
    }
  }
  return true;
}
