import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type {
  IClientLogger,
  IWebServerSectionGuiManager,
  WebServerSectionGuiManagerHandlers,
} from "../../contracts/index.js";
import type { SetupState } from "../../types/SetupState.js";

export class WebServerSectionGuiManager implements IWebServerSectionGuiManager {
  private status: ManagerStatus = "IDLE";
  private readonly els = {
    section: document.querySelector<HTMLDivElement>(".web-server-section")!,
  };
  private handlers: WebServerSectionGuiManagerHandlers | null = null;

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "WebServerGuiManager" });
  }

  private ensureElementsExist(): void {
    Object.entries(this.els).forEach(([key, el]) => {
      // If it's a group (and not a DOM element), loop its children
      if (el && typeof el === "object" && !(el instanceof HTMLElement)) {
        Object.entries(el).forEach(([subKey, subEl]) => {
          if (!subEl) throw new Error(`Missing UI element: ${key}.${subKey}`);
        });
      }
      // Otherwise, check it as a flat element
      else if (!el) {
        throw new Error(`Missing UI element: ${key}`);
      }
    });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the WebServerGuiManager whilst its status is ${this.status}`,
      );
    }
    this.ensureElementsExist();
    this.status = "INITIALIZED";
  }
  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the WebServerGuiManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.setupListeners();
    this.status = "RUNNING";
  }

  setHandlers(handlers: WebServerSectionGuiManagerHandlers): void {
    this.handlers = handlers;
  }

  displayState(state: SetupState): void {
    //Add in logic here:
    this.logger.info("Displaying state");
  }

  private setupListeners(): void {}

  private get activeHandlers(): WebServerSectionGuiManagerHandlers {
    if (!this.handlers)
      throw new Error("WebServerGuiManager handlers not initialized!");
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
