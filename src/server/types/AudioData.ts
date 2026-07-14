import {
  dataIsArrayOfPlNameInfos,
  type PlNameInfo,
  dataIsAdminInputGainsInfo,
  type AdminInputGainsInfo,
} from "../../shared/types/index.js";
import {
  dataIsArrayOfAllowedPlsInfos,
  type AllowedPlsInfo,
} from "./AllowedPlsInfo.js";
import {
  dataIsObject,
  dataIsType,
  dataIsTypeAOrB,
} from "../../shared/helpers.js";
import {} from "../../shared/types/index.js";

//This is what we get from the DataManager. numUsers cannot be included, because we will get that from the AccountManager (it is important that the AudioController shadows the AccountManager when it comes to the number of users):
export interface AudioData {
  requestedNumSoundcardChannels?: number;
  numPartylines?: number;
  requestedSoundcardId?: number;
  allowedPlsInfos?: AllowedPlsInfo[];
  plNames?: PlNameInfo[];
  inputGains?: AdminInputGainsInfo;
}

//This is what we pass into the AudioController during the populate stage. numUsers is now mandatory:
export interface AudioPopulateData {
  numUsers: number;
  requestedNumSoundcardChannels?: number;
  numPartylines?: number;
  requestedSoundcardId?: number;
  allowedPlsInfos?: AllowedPlsInfo[];
  plNames?: PlNameInfo[];
  inputGains?: AdminInputGainsInfo;
}

export function dataIsAudioData(data: unknown): data is AudioData {
  return (
    dataIsObject(data) &&
    dataIsTypeAOrB(
      "safeIntegerNum",
      "undefined",
      data.requestedNumSoundcardChannels,
    ) &&
    dataIsTypeAOrB("safeIntegerNum", "undefined", data.numPartylines) &&
    dataIsTypeAOrB("safeIntegerNum", "undefined", data.requestedSoundcardId) &&
    (dataIsArrayOfAllowedPlsInfos(data.allowedPlsInfos) ||
      dataIsType("undefined", data.allowedPlsInfos)) &&
    (dataIsArrayOfPlNameInfos(data.plNames) ||
      dataIsType("undefined", data.plNames)) &&
    (dataIsAdminInputGainsInfo(data.inputGains) ||
      dataIsType("undefined", data.inputGains))
  );
}
