export interface ShortTailInfo {
  portNum: number;
  plNum: number;
  startTimestamp: number;
  timeoutId: ReturnType<typeof setTimeout>;
}
