import { dataIsObject, dataIsType } from "../helpers.js";

export interface AdminSoundcardInfo {
  id: number;
  name: string;
  maxInputChannels: number;
  maxOutputChannels: number;
  defaultSampleRate: number;
  selected: boolean;
}

export type AdminSoundcardsInfo = AdminSoundcardInfo[];

export function dataIsAdminSoundcardInfo(
  data: unknown,
): data is AdminSoundcardInfo {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.id) &&
    dataIsType("string", data.name) &&
    dataIsType("number", data.maxInputChannels) &&
    dataIsType("number", data.maxOutputChannels) &&
    dataIsType("number", data.defaultSampleRate) &&
    dataIsType("boolean", data.selected)
  );
}

export function dataIsAdminSoundcardsInfo(
  data: unknown,
): data is AdminSoundcardsInfo {
  return Array.isArray(data) && data.every(dataIsAdminSoundcardInfo);
}
