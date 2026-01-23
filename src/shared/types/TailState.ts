const TAIL_STATE = {
  NONE: "NONE",
  SHORT: "SHORT",
  LONG: "LONG",
} as const;

export type TailState = (typeof TAIL_STATE)[keyof typeof TAIL_STATE];

export function dataIsTailState(data: unknown): data is TailState {
  return Object.values(TAIL_STATE).some((el) => el === data);
}
