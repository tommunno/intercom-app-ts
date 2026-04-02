import type { KeyType } from "../../../shared/types/index.js";

export interface MomentaryTime {
  pointerId: number;
  type: KeyType;
  btnId: number;
  startTime: number;
}
