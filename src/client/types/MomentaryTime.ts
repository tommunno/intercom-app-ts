import type { KeyType } from "../../shared/types/KeyType.js";

export interface MomentaryTime {
  pointerId: number;
  type: KeyType;
  btnId: number;
  startTime: number;
}
