import {
  dataIsArrayOfPlNameInfos,
  type PlNameInfo,
} from "../../shared/types/PlNameInfo.js";
import {
  dataIsArrayOfAllowedPlsInfos,
  type AllowedPlsInfo,
} from "./AllowedPlsInfo.js";
import {
  dataIsObject,
  dataIsType,
  dataIsTypeAOrB,
} from "../../shared/helpers.js";

//This is what we get from the DataManager. numUsers cannot be included, because we will get that from the AccountManager (it is important that the AudioController shadows the AccountManager when it comes to the number of users):
export interface AudioData {
  requestedNumSoundcardChannels?: number;
  numPartylines?: number;
  requestedSoundcardId?: number;
  allowedPlsInfos?: AllowedPlsInfo[];
  plNames?: PlNameInfo[];
}

//This is what we pass into the AudioController during the populate stage. numUsers is now mandatory:
export interface AudioPopulateData {
  numUsers: number;
  requestedNumSoundcardChannels?: number;
  numPartylines?: number;
  requestedSoundcardId?: number;
  allowedPlsInfos?: AllowedPlsInfo[];
  plNames?: PlNameInfo[];
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
      dataIsType("undefined", data.plNames))
  );
}
