import type { ManagerStatus } from "../../shared/types/index.js";
import type {
  IClientLogger,
  ISetupGlobalGuiManager,
  SetupGlobalGuiManagerHandlers,
} from "../contracts/index.js";
import type { SetupState } from "../types/index.js";

export class SetupGlobalGuiManager implements ISetupGlobalGuiManager {
  private status: ManagerStatus = "IDLE";

  private readonly els = {
    optionBar: {
      logoutBtn: document.querySelector<HTMLButtonElement>(".logout-btn")!,
    },
    error: {
      modalOverlay: document.querySelector<HTMLDivElement>(
        ".modal-overlay-error",
      )!,
    },
  };
  private handlers: SetupGlobalGuiManagerHandlers | null = null;

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "SetupGlobalGuiManager" });
  }

  ensureElementsExist(): void {
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
        `Cannot initialize the SetupGlobalGuiManager whilst its status is ${this.status}`,
      );
    }
    this.ensureElementsExist();
    this.status = "INITIALIZED";
  }
  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the SetupGlobalGuiManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.setupListeners();
    this.status = "RUNNING";
  }

  setHandlers(handlers: SetupGlobalGuiManagerHandlers): void {
    this.handlers = handlers;
  }

  displayState(state: SetupState): void {
    const notRunning = this.checkAndWarnIfNotRunning("display state");
    if (notRunning) return;
    //Display state here
  }

  setErrorModal(visible: boolean): void {
    const notRunning = this.checkAndWarnIfNotRunning("set error modal");
    if (notRunning) return;

    const { modalOverlay } = this.els.error;
    modalOverlay.style.display = visible ? "flex" : "none";
    document.body.classList.toggle("no-scroll", visible);
    // if (visible && this.popupVisible) {
    //   this.hidePopup();
    // }
  }

  private setupListeners(): void {
    this.setupOptionBarListeners();
  }

  private setupOptionBarListeners(): void {
    const { logoutBtn } = this.els.optionBar;

    logoutBtn.addEventListener("click", (e) => this.handleLogoutButtonClick(e));
  }

  private handleLogoutButtonClick(e: PointerEvent): void {
    e.preventDefault();
    this.activeHandlers.onLogoutBtnClick();
  }

  private get activeHandlers(): SetupGlobalGuiManagerHandlers {
    if (!this.handlers)
      throw new Error("PanelGuiManager handlers not initialized!");
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
