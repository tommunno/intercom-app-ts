import { dataIsObject } from "../helpers.js";
import {
  dataIsAdminAudioConfigInfo,
  type AdminAudioConfigInfo,
} from "./AdminAudioConfigInfo.js";
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
  dataIsAdminSoundcardInfo,
  type AdminSoundcardInfo,
} from "./AdminSoundcardInfo.js";
import { dataIsAdminUsersInfo, type AdminUsersInfo } from "./AdminUsersInfo.js";
import {
  dataIsAdminWebServerInfo,
  type AdminWebServerInfo,
} from "./AdminWebServerInfo.js";

export interface AdminSnapshot {
  webServerInfo: AdminWebServerInfo;
  inputGainsInfo: AdminInputGainsInfo;
  usersInfo: AdminUsersInfo;
  partylinesInfo: AdminPartylinesInfo;
  soundcardInfo: AdminSoundcardInfo;
  audioConfigInfo: AdminAudioConfigInfo;
  loggingInfo: AdminLoggingInfo;
}

export type AdminUpdate = Partial<AdminSnapshot>;

const ADMIN_SNAPSHOT_VALIDATORS: Record<
  keyof AdminSnapshot,
  (x: unknown) => boolean
> = {
  webServerInfo: dataIsAdminWebServerInfo,
  inputGainsInfo: dataIsAdminInputGainsInfo,
  usersInfo: dataIsAdminUsersInfo,
  partylinesInfo: dataIsAdminPartylinesInfo,
  soundcardInfo: dataIsAdminSoundcardInfo,
  audioConfigInfo: dataIsAdminAudioConfigInfo,
  loggingInfo: dataIsAdminLoggingInfo,
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
