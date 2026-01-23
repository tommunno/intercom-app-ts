import type { PartylineInfo } from "../../../shared/types/index.js";
import type { AudioConfig } from "../../types/index.js";

export interface IAudioMatrixManager {
  init: (config: AudioConfig) => void;
  start: () => void;
  stop: () => void;
  getPartylineInfos: (userId: number) => PartylineInfo[] | null;
}
