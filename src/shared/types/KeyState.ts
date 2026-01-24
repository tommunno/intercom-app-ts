export const KEY_STATE = {
  ON: "ON",
  OFF: "OFF",
} as const;

export type KeyState = (typeof KEY_STATE)[keyof typeof KEY_STATE];

export function dataIsKeyState(data: unknown): data is KeyState {
  return Object.values(KEY_STATE).some((el) => el === data);
}
