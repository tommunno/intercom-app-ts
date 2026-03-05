import type {
  AdminAudioConfigInfo,
  AdminInputGainsInfo,
  AdminLoggingInfo,
  AdminPartylinesInfo,
  AdminSoundcardInfo,
  AdminUsersInfo,
  AdminWebServerInfo,
} from "../../shared/types/index.js";

export interface SetupState {
  attemptingAutomaticLogin: boolean;
  webServerInfo: AdminWebServerInfo;
  inputGainsInfo: AdminInputGainsInfo;
  usersInfo: AdminUsersInfo;
  partylinesInfo: AdminPartylinesInfo;
  soundcardInfo: AdminSoundcardInfo;
  audioConfigInfo: AdminAudioConfigInfo;
  loggingInfo: AdminLoggingInfo;
}
