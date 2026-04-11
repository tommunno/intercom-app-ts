import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type {
  ILogger,
  IProcessStatsManager,
  ProcessStatsHandlers,
  ProcessStats,
} from "../../contracts/index.js";
//External:
import pidusage from "pidusage";

export class ProcessStatsManager implements IProcessStatsManager {
  private _status: ManagerStatus = "IDLE";
  private _handlers: ProcessStatsHandlers | null = null;
  private _stats: ProcessStats = { cpuUsage: null, memoryUsage: null };
  private statsTimerId: ReturnType<typeof setInterval> | null = null;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "ProcessStatsManager" });
  }

  init(): void {
    if (this._status !== "IDLE") {
      throw new Error(
        `Cannot initialize the ProcessStatsManager whilst its status is ${this._status}`,
      );
    }
    this._status = "INITIALIZED";
  }

  start(): void {
    if (this._status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the ProcessStatsManager whilst its status is ${this._status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.startStatsTimer();
    this._status = "RUNNING";
  }

  setHandlers(handlers: ProcessStatsHandlers): void {
    this._handlers = handlers;
  }

  get status(): ManagerStatus {
    return this._status;
  }

  get stats(): ProcessStats {
    return { ...this._stats };
  }

  private startStatsTimer(): void {
    if (this.statsTimerId !== null) {
      this.logger.error(
        "startStatsTimer: Stats timer is already running. Will do nothing",
      );
      return;
    }
    this.updateStats();
    // Send another update after 2.5 seconds, once startup activity has settled down:
    setTimeout(() => this.updateStats(), 2500);
    this.statsTimerId = setInterval(() => this.updateStats(), 5000);
  }

  private updateStats(): void {
    pidusage(process.pid, (err, stats) => {
      if (!err) {
        this._stats = {
          cpuUsage: +stats.cpu.toFixed(1), // percent
          memoryUsage: +(stats.memory / 1024 / 1024).toFixed(1), // MB
        };
      }
      this.activeHandlers.onProcessStatsUpdate();
    });
  }

  private get activeHandlers(): ProcessStatsHandlers {
    if (!this._handlers)
      throw new Error("ProcessStatsManager handlers not initialized!");
    return this._handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this._status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this._status}`,
      );
      return true;
    }
    return false;
  }
}
