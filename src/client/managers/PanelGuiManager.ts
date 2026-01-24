import {
  type IPanelGuiManager,
  type PanelGuiManagerHandlers,
} from "../contracts/index.js";
import {
  dataIsKeyState,
  dataIsTailState,
  KEY_TYPE,
  type AudioInfo,
  type KeyType,
  type ManagerStatus,
  type MergedPartylineInfo,
  type UserInfo,
} from "../../shared/types/index.js";
import { type PanelState } from "../types/index.js";

export class PanelGuiManager implements IPanelGuiManager {
  private status: ManagerStatus = "IDLE";
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
    optionBar: {
      username: document.querySelector<HTMLSpanElement>(".username")!,
      muteMicBtn: document.querySelector<HTMLButtonElement>(".mute-mic-btn")!,
      logoutBtn: document.querySelector<HTMLButtonElement>(".logout-btn")!,
    },
    pls: {
      plsList: document.querySelector<HTMLUListElement>(".pls-list")!,
    },
  };
  private handlers: PanelGuiManagerHandlers | null = null;
  //By default, the HTML has the login in loading state, until the JS loads
  private loginLoading: boolean = true;

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
        `Cannot initialize the PanelGuiManager whilst its status is ${this.status}`,
      );
    }
    this.ensureElementsExist();
    this.status = "INITIALIZED";
  }
  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the PanelGuiManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;
    this.setupListeners();
    this.status = "RUNNING";
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

  displayState(state: PanelState): void {
    const notRunning = this.checkAndWarnIfNotRunning("display state");
    if (notRunning) return;
    this.displayUserInfo(state.userInfo);
    this.displayAudioInfo(state.audioInfo);
  }

  displayUserInfo(userInfo: UserInfo): void {
    const notRunning = this.checkAndWarnIfNotRunning("display userInfo");
    if (notRunning) return;
    this.els.optionBar.username.textContent = userInfo.username;
  }

  displayAudioInfo(audioInfo: AudioInfo): void {
    const notRunning = this.checkAndWarnIfNotRunning("display audioInfo");
    if (notRunning) return;
    const { partylines } = audioInfo;
    const { plsList } = this.els.pls;
    const idsNeeded = new Set<number>(partylines.map((pl) => pl.id));
    const idsOnPage = new Set<number>();

    Array.from(plsList.querySelectorAll<HTMLLIElement>("li.pl")).forEach(
      (plEl) => {
        const { id } = plEl.dataset;
        if (id === undefined || !Number.isSafeInteger(+id)) {
          console.error(`plEl has an invalid id of ${id} in displayAudioInfo`);
          plEl.remove();
          return;
        }
        const idNum = +id;

        const partyline = partylines.find((pl) => pl.id === idNum);
        if (!partyline || idsOnPage.has(idNum)) {
          plEl.remove();
          return;
        }

        this.displayPartylineForPlEl(partyline, plEl);
        idsOnPage.add(idNum);
      },
    );

    const idsMissing = new Set<number>(
      [...idsNeeded].filter((id) => !idsOnPage.has(id)),
    );

    idsMissing.forEach((id) => {
      const partyline = partylines.find((pl) => pl.id === id);
      if (!partyline) return;
      const plEl = this.createNewPlElWithId(id);
      this.displayPartylineForPlEl(partyline, plEl);
      plsList.appendChild(plEl);
    });

    this.sortPlsListToMatchPartylines(partylines);
  }

  private sortPlsListToMatchPartylines(
    partylines: MergedPartylineInfo[],
  ): void {
    const { plsList } = this.els.pls;

    // desired order map
    const order = new Map<number, number>();
    partylines.forEach((pl, i) => order.set(pl.id, i));

    const items = Array.from(plsList.querySelectorAll<HTMLLIElement>("li.pl"));

    // current ids that exist in the desired list
    const currentIds = items
      .map((el) => Number(el.dataset.id))
      .filter((id) => order.has(id));

    // desired ids that currently exist in the DOM
    const currentSet = new Set(currentIds);
    const desiredIds = partylines
      .map((pl) => pl.id)
      .filter((id) => currentSet.has(id));

    // If already in correct order, do nothing
    const alreadySorted =
      currentIds.length === desiredIds.length &&
      currentIds.every((id, i) => id === desiredIds[i]);

    if (alreadySorted) return;

    // Otherwise, reorder DOM once
    items.sort((a, b) => {
      const aIdx = order.get(Number(a.dataset.id)) ?? Number.POSITIVE_INFINITY;
      const bIdx = order.get(Number(b.dataset.id)) ?? Number.POSITIVE_INFINITY;
      return aIdx - bIdx;
    });

    plsList.append(...items);
  }

  private createNewPlElWithId(id: number): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "pl";
    li.dataset.id = String(id);

    li.innerHTML = `
    <button class="btn talk-btn" type="button">Talk</button>
    <div class="pl-info">
      <h2 class="pl-name"></h2>
    </div>
    <button class="btn listen-btn" type="button">Listen</button>
  `;
    return li;
  }

  private displayPartylineForPlEl(
    partyline: MergedPartylineInfo,
    plEl: HTMLLIElement,
  ): void {
    const plNameEl = plEl.querySelector<HTMLHeadingElement>(".pl-name");
    const talkBtnEl = plEl.querySelector<HTMLButtonElement>(".talk-btn");
    const listenBtnEl = plEl.querySelector<HTMLButtonElement>(".listen-btn");

    if (!plNameEl || !talkBtnEl || !listenBtnEl) {
      console.error(
        `Missing HTML elements for plEl with id ${plEl.dataset.id} in displayAudioInfo`,
      );
      return;
    }

    plNameEl.textContent = partyline.name;
    talkBtnEl.classList.toggle("talk-btn-active", partyline.talk === "ON");
    talkBtnEl.dataset.id = String(partyline.id);
    talkBtnEl.dataset.state = partyline.talk;
    talkBtnEl.dataset.tailState = partyline.tailState;
    listenBtnEl.classList.toggle(
      "listen-btn-active",
      partyline.listen === "ON",
    );
    listenBtnEl.dataset.id = String(partyline.id);
    listenBtnEl.dataset.state = partyline.listen;
  }

  //More to implement in here, eg focus trapping
  setLoginVisible(isVisible: boolean): void {
    document.body.classList.toggle("hide-login", !isVisible);
    document.body.classList.toggle("no-scroll", isVisible);
  }

  private setupListeners(): void {
    this.setupLoginListeners();
    this.setupOptionBarListeners();
    this.setupPartylineListeners();
  }

  private setupLoginListeners(): void {
    const { form } = this.els.login;

    form.addEventListener("submit", (e) => this.handleLoginFormSubmit(e));
  }

  private handleLoginFormSubmit(e: SubmitEvent): void {
    e.preventDefault();
    if (this.loginLoading) return;
    const { username, password } = this.els.login;
    this.activeHandlers.onLoginAttempt(username.value, password.value);
  }

  private setupOptionBarListeners(): void {
    const { muteMicBtn, logoutBtn } = this.els.optionBar;

    logoutBtn.addEventListener("click", (e) => this.handleLogoutButtonClick(e));
  }

  handleLogoutButtonClick(e: PointerEvent): void {
    e.preventDefault();
    this.activeHandlers.onLogoutBtnClick();
  }

  private setupPartylineListeners(): void {
    const { plsList } = this.els.pls;

    plsList.addEventListener("pointerdown", (e) =>
      this.handlePlsListPointerDown(e),
    );
  }

  handlePlsListPointerDown(e: PointerEvent): void {
    //Ignore right click and non non-primary mouse buttons
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el && el.closest<HTMLButtonElement>(".talk-btn, .listen-btn");
    if (!btn || btn.disabled) return;

    // Prevent scrolling / text selection on touch
    e.preventDefault();

    const type: KeyType = btn.classList.contains("talk-btn")
      ? "TALK"
      : "LISTEN";

    const id = Number(btn.dataset.id);
    const currState = btn.dataset.state;
    const tailState = btn.dataset.tailState;

    if (Number.isNaN(id) || !dataIsKeyState(currState)) {
      console.error(
        `Invalid data retrieved from DOM in handlePlsListPointerDown: id: ${id}, currState: ${currState}`,
      );
      return;
    }
    if (type === "TALK") {
      if (!dataIsTailState(tailState)) {
        console.error(
          `Invalid data retrieved from DOM in handlePlsListPointerDown: id: ${id}, tailState: ${tailState}`,
        );
        return;
      }
      this.activeHandlers.onKeyPress({ type, id, currState, tailState });
      return;
    }
    this.activeHandlers.onKeyPress({ type, id, currState });
  }

  private get activeHandlers(): PanelGuiManagerHandlers {
    if (!this.handlers)
      throw new Error("PanelGuiManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.status !== "RUNNING") {
      console.error(`Unable to ${action} because the status is ${this.status}`);
      return true;
    }
    return false;
  }
}
