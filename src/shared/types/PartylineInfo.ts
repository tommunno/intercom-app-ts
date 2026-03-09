import { dataIsObject, dataIsType } from "../helpers.js";
import { dataIsKeyState, type KeyState } from "./KeyState.js";

export interface PartylineInfo {
  id: number;
  name: string;
  talk: KeyState;
  listen: KeyState;
  allowed: boolean;
}

export function dataIsPartylineInfo(data: unknown): data is PartylineInfo {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.id) &&
    dataIsType("string", data.name) &&
    dataIsKeyState(data.talk) &&
    dataIsKeyState(data.listen) &&
    dataIsType("boolean", data.allowed)
  );
}
