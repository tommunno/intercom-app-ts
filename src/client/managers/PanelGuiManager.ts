import type {
  IPanelGuiManager,
  PanelGuiManagerHandlers,
} from "../contracts/index.js";
import type { ManagerState } from "../../shared/types/index.js";

export class PanelGuiManager implements IPanelGuiManager {
  private state: ManagerState = "IDLE";
  private readonly els = {
    login: {
      form: document.querySelector<HTMLFormElement>(".login-form")!,
      username: document.querySelector<HTMLInputElement>("#username")!,
      password: document.querySelector<HTMLInputElement>("#password")!,
      loginBtn: document.querySelector<HTMLButtonElement>(".login-btn")!,
      errorMessage: document.querySelector<HTMLDivElement>(
        ".login-error-message",
      )!,
    },
  };
  private handlers: PanelGuiManagerHandlers | null = null;
  private loginLoading: boolean = false;

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
    if (this.state !== "IDLE") {
      throw new Error(
        `Cannot initialize the PanelGuiManager whilst its state is ${this.state}`,
      );
    }
    this.ensureElementsExist();
    this.state = "INITIALIZED";
  }
  start(): void {
    if (this.state !== "INITIALIZED") {
      throw new Error(
        `Cannot start the PanelGuiManager whilst its state is ${this.state}`,
      );
    }
    this.setupListeners();
    this.state = "RUNNING";
  }

  setHandlers(handlers: PanelGuiManagerHandlers): void {
    this.handlers = handlers;
  }

  setLoginError(errMessage: string | null): void {
    const notRunning = this.checkAndWarnIfNotRunning("set the login error");
    if (notRunning) return;

    const { errorMessage: em } = this.els.login;
    em.textContent = errMessage === null ? "" : errMessage;
    em.style.display = errMessage === null ? "none" : "block";
  }

  setLoginLoading(isLoading: boolean) {
    const notRunning = this.checkAndWarnIfNotRunning("set login loading");
    if (notRunning) return;
    this.loginLoading = isLoading;
    const { loginBtn } = this.els.login;
    loginBtn.disabled = isLoading;
    loginBtn.classList.toggle("disabled", isLoading);
  }

  private setupListeners() {
    this.setupLoginListeners();
  }

  private setupLoginListeners() {
    const { form } = this.els.login;

    form.addEventListener("submit", (e) => this.handleLoginFormSubmit(e));
  }

  private handleLoginFormSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (this.loginLoading) return;
    const { username, password } = this.els.login;
    this.activeHandlers.onLoginAttempt(username.value, password.value);
  }

  private get activeHandlers(): PanelGuiManagerHandlers {
    if (!this.handlers)
      throw new Error("PanelGuiManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.state !== "RUNNING") {
      console.error(`Unable to ${action} because the state is ${this.state}`);
      return true;
    }
    return false;
  }
}
