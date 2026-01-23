import { dataIsObject, dataIsType } from "../helpers.js";

export interface PartylineInfo {
  id: number;
  name: string;
  talk: boolean;
  listen: boolean;
}

export function dataIsPartylineInfo(data: unknown): data is PartylineInfo {
  return (
    dataIsObject(data) &&
    dataIsType("number", data.id) &&
    dataIsType("string", data.name) &&
    dataIsType("boolean", data.talk) &&
    dataIsType("boolean", data.listen)
  );
}
