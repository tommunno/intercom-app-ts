import { dataIsObject } from "../helpers.js";
import {
  dataIsPartylineInfo,
  type PartylineInfo,
  dataIsTailState,
  type TailState,
} from "./index.js";

export interface MergedPartylineInfo extends PartylineInfo {
  tailState: TailState;
}

export function dataIsMergedPartylineInfo(
  data: unknown,
): data is MergedPartylineInfo {
  return (
    dataIsObject(data) &&
    dataIsPartylineInfo(data) &&
    dataIsTailState(data.tailState)
  );
}

export function dataIsArrayOfMergedPartylineInfos(
  data: unknown,
): data is MergedPartylineInfo[] {
  return (
    Array.isArray(data) && data.every((el) => dataIsMergedPartylineInfo(el))
  );
}
