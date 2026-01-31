import type { ManagerStatus } from "../../shared/types/ManagerStatus.js";
import type {
  IClientLogger,
  IPanelWebRtcManager,
  PanelWebRtcHandlers,
} from "../contracts/index.js";

export class PanelWebRtcManager implements IPanelWebRtcManager {
  private status: ManagerStatus = "IDLE";
  private handlers: PanelWebRtcHandlers | null = null;

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "PanelWebRtcManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the PanelWebRtcManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the PanelWebRtcManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;

    this.status = "RUNNING";
  }

  setHandlers(handlers: PanelWebRtcHandlers): void {
    this.handlers = handlers;
  }

  private get activeHandlers(): PanelWebRtcHandlers {
    if (!this.handlers)
      throw new Error("PanelWebRtcManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this.status}`,
      );
      return true;
    }
    return false;
  }
}
