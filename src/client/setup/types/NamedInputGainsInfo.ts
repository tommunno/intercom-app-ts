import type { AdminInputGainInfo } from "../../../shared/types/index.js";

export interface NamedInputGainInfo extends AdminInputGainInfo {
  name: string;
}

export type NamedInputGainsInfo = NamedInputGainInfo[];
