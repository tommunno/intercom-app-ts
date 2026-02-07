import { dataIsObject } from "../helpers.js";
import {
  dataIsArrayOfMergedPartylineInfos,
  type MergedPartylineInfo,
} from "./index.js";

export interface AudioInfo {
  partylines: MergedPartylineInfo[];
}

export function dataIsAudioInfo(data: unknown): data is AudioInfo {
  return (
    dataIsObject(data) && dataIsArrayOfMergedPartylineInfos(data.partylines)
  );
}
