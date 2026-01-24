export const KEY_TYPE = {
  TALK: "TALK",
  LISTEN: "LISTEN",
} as const;

export type KeyType = (typeof KEY_TYPE)[keyof typeof KEY_TYPE];

export function dataIsKeyType(data: unknown): data is KeyType {
  return Object.values(KEY_TYPE).some((el) => el === data);
}
