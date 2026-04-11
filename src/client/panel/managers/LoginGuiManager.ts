import type { ManagerStatus } from "../../../shared/types/index.js";
import type {
  ILoginGuiManager,
  LoginGuiManagerHandlers,
} from "../contracts/index.js";
import type { IClientLogger } from "../../shared/contracts/index.js";

export class LoginGuiManager implements ILoginGuiManager {
  private status: ManagerStatus = "IDLE";
  private readonly els = {
    login: {
      windowWrapper: document.querySelector<HTMLDivElement>(
        ".login-window-wrapper",
      )!,
      form: document.querySelector<HTMLFormElement>(".login-form")!,
      username: document.querySelector<HTMLInputElement>("#username")!,
      passwordInputWrapper: document.querySelector<HTMLDivElement>(
        ".password-input-wrapper",
      )!,
      password: document.querySelector<HTMLInputElement>("#password")!,
      openEye: document.querySelector<SVGSVGElement>(".open-eye")!,
      closedEye: document.querySelector<SVGSVGElement>(".closed-eye")!,
      loginBtn: document.querySelector<HTMLButtonElement>(".login-btn")!,
      errorMessage: document.querySelector<HTMLDivElement>(
        ".login-error-message",
      )!,
    },
  };
  private handlers: LoginGuiManagerHandlers | null = null;
  //By default, the HTML has the login in loading state, until the JS loads
  private loginLoading: boolean = true;

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "LoginGuiManager" });
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
        `Cannot initialize the LoginGuiManager whilst its status is ${this.status}`,
      );
    }
    this.ensureElementsExist();
    this.status = "INITIALIZED";
  }
  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the LoginGuiManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.setupListeners();
    this.els.login.username.focus();
    this.status = "RUNNING";
  }

  setHandlers(handlers: LoginGuiManagerHandlers): void {
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

  //More to implement in here, eg focus trapping
  setLoginVisible(isVisible: boolean): void {
    document.body.classList.toggle("hide-login", !isVisible);
    document.body.classList.toggle("no-scroll", isVisible);
  }

  shakeLogin(): void {
    const { windowWrapper } = this.els.login;
    // Remove the class if it's already there
    windowWrapper.classList.remove("shake");

    // Force reflow so re-adding the class restarts the animation
    void windowWrapper.offsetWidth;

    // Add the class again
    windowWrapper.classList.add("shake");
  }

  private setupListeners(): void {
    this.setupLoginListeners();
  }

  private setupLoginListeners(): void {
    const { form, openEye, closedEye } = this.els.login;

    form.addEventListener("submit", (e) => this.handleLoginFormSubmit(e));

    openEye.addEventListener("click", () => this.handleOpenEyeClick());
    closedEye.addEventListener("click", () => this.handleClosedEyeClick());
  }

  private handleLoginFormSubmit(e: SubmitEvent): void {
    e.preventDefault();
    if (this.loginLoading) return;
    this.setPasswordVisibility(false);
    const { username, password } = this.els.login;
    this.activeHandlers.onLoginAttempt(username.value, password.value);
  }

  private handleOpenEyeClick(): void {
    this.setPasswordVisibility(true);
  }

  private handleClosedEyeClick(): void {
    this.setPasswordVisibility(false);
  }

  private setPasswordVisibility(visible: boolean): void {
    const { passwordInputWrapper, password } = this.els.login;

    passwordInputWrapper.classList.toggle("password-shown", visible);
    password.type = visible ? "text" : "password";
    password.focus();
  }

  private get activeHandlers(): LoginGuiManagerHandlers {
    if (!this.handlers)
      throw new Error("LoginGuiManager handlers not initialized!");
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
