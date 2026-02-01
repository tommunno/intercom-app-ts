import {
  DEFAULT_NUM_PARTYLINES,
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
  MAX_NUM_PARTYLINES,
  MAX_NUM_SOUNDCARD_CHANNELS,
} from "../server/constants/serverConstants.js";

export function isStringAndNotEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function validatePort(port: number | undefined): port is number {
  return (
    port !== undefined &&
    Number.isSafeInteger(port) &&
    (port >= 1025 || port === 80 || port === 443) &&
    port <= 65535
  );
}

export function isAddressLocalhost(address: string | undefined) {
  return (
    address === "127.0.0.1" ||
    address === "::1" ||
    address === "::ffff:127.0.0.1"
  );
}

export function dataIsObject(data: unknown): data is Record<string, unknown> {
  return data !== null && typeof data === "object" && !Array.isArray(data);
}

type TypeMap = {
  string: string;
  number: number;
  safeIntegerNum: number;
  boolean: boolean;
  bigint: bigint;
  symbol: symbol;
  undefined: undefined;
  null: null;
};

type TypeofTag = keyof TypeMap;

export function dataIsType<K extends TypeofTag>(
  type: K,
  data: unknown,
): data is TypeMap[K] {
  if (type === "null") return data === null;
  if (type === "safeIntegerNum") return Number.isSafeInteger(data);
  return typeof data === type;
}

export function dataIsTypeAOrB<A extends TypeofTag, B extends TypeofTag>(
  a: A,
  b: B,
  data: unknown,
): data is TypeMap[A] | TypeMap[B] {
  return dataIsType(a, data) || dataIsType(b, data);
}

export function dataIsArrayOfType<K extends TypeofTag>(
  type: K,
  data: unknown,
): data is TypeMap[K][] {
  return Array.isArray(data) && data.every((el) => dataIsType(type, el));
}

export function validateServerConstants(): void {
  if (DEFAULT_NUM_SOUNDCARD_CHANNELS > MAX_NUM_SOUNDCARD_CHANNELS) {
    throw new Error(
      `DEFAULT_NUM_SOUNDCARD_CHANNELS is greater than MAX_NUM_SOUNDCARD_CHANNELS`,
    );
  }
  if (DEFAULT_NUM_PARTYLINES > MAX_NUM_PARTYLINES) {
    throw new Error(
      `DEFAULT_NUM_SOUNDCARD_CHANNELS is greater than MAX_NUM_SOUNDCARD_CHANNELS`,
    );
  }
}
