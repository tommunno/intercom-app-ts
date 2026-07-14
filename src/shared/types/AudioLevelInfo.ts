import { dataIsObject, dataIsType } from "../helpers.js";

export interface AudioLevelInfo {
  rmsDb: number;
  peakDb: number;
}

export type AudioLevelInfos = AudioLevelInfo[];

export function dataIsAudioLevelInfo(data: unknown): data is AudioLevelInfo {
  return (
    dataIsObject(data) &&
    dataIsType("number", data.rmsDb) &&
    dataIsType("number", data.peakDb)
  );
}

export function dataIsArrayOfAudioLevelInfos(
  data: unknown,
): data is AudioLevelInfos {
  return Array.isArray(data) && data.every((el) => dataIsAudioLevelInfo(el));
}
