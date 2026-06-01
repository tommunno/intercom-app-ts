import { dataIsAccountData, type AccountData } from "./AccountData.js";
import {
  dataIsAdminAccountData,
  type AdminAccountData,
} from "./AdminAccountData.js";
import { dataIsAudioData, type AudioData } from "./AudioData.js";
import { dataIsNetworkData, type NetworkData } from "./NetworkData.js";
import type Database from "better-sqlite3";

export const DATA_KEYS = {
  ACCOUNT: "ACCOUNT",
  ADMIN_ACCOUNT: "ADMIN_ACCOUNT",
  NETWORK: "NETWORK",
  AUDIO: "AUDIO",
} as const;

export type DataKey = (typeof DATA_KEYS)[keyof typeof DATA_KEYS];

export type DataPayloadMap = {
  ACCOUNT: AccountData;
  ADMIN_ACCOUNT: AdminAccountData;
  NETWORK: NetworkData;
  AUDIO: AudioData;
};

export type EnsureAllDataKeysHavePayloads = {
  [K in DataKey]: DataPayloadMap[K];
};

export type UpsertDataStatement = Database.Statement<[DataKey, string, number]>;

export type GetDataStatement = Database.Statement<[DataKey], { json: string }>;

// PAYLOAD VALIDATION:
export const DATA_PAYLOAD_VALIDATORS = {
  [DATA_KEYS.ACCOUNT]: dataIsDbAccountData,
  [DATA_KEYS.ADMIN_ACCOUNT]: dataIsDbAdminAccountData,
  [DATA_KEYS.NETWORK]: dataIsDbNetworkData,
  [DATA_KEYS.AUDIO]: dataIsDbAudioData,
} satisfies DataPayloadValidators;

export type DataPayloadValidators = {
  [K in DataKey]: (data: unknown) => data is DataPayloadMap[K];
};

export function dataIsDbAccountData(
  data: unknown,
): data is DataPayloadMap[typeof DATA_KEYS.ACCOUNT] {
  return dataIsAccountData(data);
}

export function dataIsDbAdminAccountData(
  data: unknown,
): data is DataPayloadMap[typeof DATA_KEYS.ADMIN_ACCOUNT] {
  return dataIsAdminAccountData(data);
}

export function dataIsDbNetworkData(
  data: unknown,
): data is DataPayloadMap[typeof DATA_KEYS.NETWORK] {
  return dataIsNetworkData(data);
}

export function dataIsDbAudioData(
  data: unknown,
): data is DataPayloadMap[typeof DATA_KEYS.AUDIO] {
  return dataIsAudioData(data);
}
