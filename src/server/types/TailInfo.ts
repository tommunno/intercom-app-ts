export type TailInfo =
  | LongTailInfo
  | ShortTailInfo
  | {
      type: "NONE";
    };

export interface LongTailInfo {
  type: "LONG";
  portNum: number;
  plNum: number;
  startTimestamp: number;
}

export interface ShortTailInfo {
  type: "SHORT";
  portNum: number;
  plNum: number;
  startTimestamp: number;
  timeoutId: ReturnType<typeof setTimeout>;
}
