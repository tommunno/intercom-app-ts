import type { TailState } from "../../../shared/types/TailState.js";
import type { AudioConfig } from "../../types/index.js";

export interface ITailManager {
  init: (config: AudioConfig) => void;

  start: () => void;
  stop: () => void;
  getTailState: (userId: number, plId: number) => TailState;
}
