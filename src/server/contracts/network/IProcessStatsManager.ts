import type { ManagerStatus } from "../../../shared/types/index.js";

export interface ProcessStatsHandlers {
  onProcessStatsUpdate: () => void;
}

export interface ProcessStats {
  cpuUsage: number | null;
  memoryUsage: number | null;
}

export interface IProcessStatsManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: ProcessStatsHandlers) => void;
  status: ManagerStatus;
  stats: ProcessStats;
}
