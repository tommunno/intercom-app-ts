import {
  type IClientLogger,
  type IPanelGlobalGuiManager,
  type PanelGlobalGuiManagerHandlers,
} from "../contracts/index.js";
import {
  dataIsKeyState,
  dataIsTailState,
  type AudioInfo,
  type KeyType,
  type ManagerStatus,
  type MergedPartylineInfo,
  type UserInfo,
} from "../../shared/types/index.js";
import {
  type DisplayPopupParams,
  type MomentaryTime,
  type PanelState,
} from "../types/index.js";
import {
  MOMENTARY_KEY_PRESS_TIME_MS,
  TAIL_DEBUG_MODE,
} from "../constants/clientConstants.js";

export class PanelGlobalGuiManager implements IPanelGlobalGuiManager {
  private status: ManagerStatus = "IDLE";
  private readonly els = {
    optionBar: {
      username: document.querySelector<HTMLSpanElement>(".username")!,
      muteMicBtn: document.querySelector<HTMLButtonElement>(".mute-mic-btn")!,
      logoutBtn: document.querySelector<HTMLButtonElement>(".logout-btn")!,
    },
    pls: {
      plsList: document.querySelector<HTMLUListElement>(".pls-list")!,
    },
    popup: {
      container: document.querySelector<HTMLDivElement>(".popup")!,
      title: document.querySelector<HTMLParagraphElement>(".popup-title")!,
      message: document.querySelector<HTMLParagraphElement>(".popup-message")!,
    },
    error: {
      modalOverlay: document.querySelector<HTMLDivElement>(
        ".modal-overlay-error",
      )!,
    },
  };
  private handlers: PanelGlobalGuiManagerHandlers | null = null;
  private hidePopupTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private popupVisible: boolean = false;
  //pointerId as key:
  private momentaryTimes: Map<number, MomentaryTime> = new Map();

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "PanelGuiManager" });
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
    void this.activeHandlers;
    this.setupListeners();
    this.status = "RUNNING";
  }

  setHandlers(handlers: PanelGlobalGuiManagerHandlers): void {
    this.handlers = handlers;
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
          this.logger.error(
            `plEl has an invalid id of ${id} in displayAudioInfo`,
          );
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

  displayPopup(params: DisplayPopupParams): void {
    const { type, title, message, autoHide } = params;

    if (this.hidePopupTimeoutId !== null) {
      clearTimeout(this.hidePopupTimeoutId);
      this.hidePopupTimeoutId = null;
    }

    const {
      container: popupEl,
      title: titleEl,
      message: messageEl,
    } = this.els.popup;

    titleEl.textContent = title;
    messageEl.textContent = message ?? "";
    popupEl.className = `popup ${type} visible`;
    this.popupVisible = true;

    if (autoHide) {
      const { hideTime } = params;

      this.hidePopupTimeoutId = setTimeout(() => {
        this.internalHidePopup();
        this.hidePopupTimeoutId = null;
      }, hideTime);
    }
  }

  hidePopup(): void {
    if (this.hidePopupTimeoutId !== null) {
      clearTimeout(this.hidePopupTimeoutId);
      this.hidePopupTimeoutId = null;
    }
    this.internalHidePopup();
  }

  private internalHidePopup(): void {
    const { container: popupEl } = this.els.popup;
    popupEl.classList.remove("visible");
    this.popupVisible = false;
  }

  setErrorModal(visible: boolean): void {
    const notRunning = this.checkAndWarnIfNotRunning("set error modal");
    if (notRunning) return;

    const { modalOverlay } = this.els.error;
    modalOverlay.style.display = visible ? "flex" : "none";
    document.body.classList.toggle("no-scroll", visible);
    if (visible && this.popupVisible) {
      this.hidePopup();
    }
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
      this.logger.error(
        `Missing HTML elements for plEl with id ${plEl.dataset.id} in displayAudioInfo`,
      );
      return;
    }
    const { tailState } = partyline;

    //If there is a shortTail or longTail, we should display to the user that the key is off:
    const displayTalk = partyline.talk === "ON" && tailState === "NONE";

    plNameEl.textContent = partyline.name;
    talkBtnEl.classList.toggle("talk-btn-active", displayTalk);
    talkBtnEl.dataset.id = String(partyline.id);
    talkBtnEl.dataset.state = partyline.talk;
    talkBtnEl.dataset.tailState = partyline.tailState;
    listenBtnEl.classList.toggle(
      "listen-btn-active",
      partyline.listen === "ON",
    );
    listenBtnEl.dataset.id = String(partyline.id);
    listenBtnEl.dataset.state = partyline.listen;

    //If TAIL_DEBUG_MODE in clientConstants is set to true, tails will be displayed visually for debug purposes:
    //Long tails will be displayed as blue, short tails will be displayed as yellow
    if (TAIL_DEBUG_MODE) {
      talkBtnEl.classList.remove("talk-btn-long-tail");
      talkBtnEl.classList.remove("talk-btn-short-tail");
      if (tailState === "LONG") {
        talkBtnEl.classList.add("talk-btn-long-tail");
      } else if (tailState === "SHORT") {
        talkBtnEl.classList.add("talk-btn-short-tail");
      }
    }
  }

  private setupListeners(): void {
    this.setupOptionBarListeners();
    this.setupPartylineListeners();
  }

  private setupOptionBarListeners(): void {
    const { muteMicBtn, logoutBtn } = this.els.optionBar;

    logoutBtn.addEventListener("click", (e) => this.handleLogoutButtonClick(e));
  }

  private handleLogoutButtonClick(e: PointerEvent): void {
    e.preventDefault();
    this.activeHandlers.onLogoutBtnClick();
  }

  private setupPartylineListeners(): void {
    const { plsList } = this.els.pls;

    plsList.addEventListener("pointerdown", (e) =>
      this.handlePlsListPointerDown(e),
    );

    window.addEventListener("pointerup", (e) =>
      this.handlePlsListPointerUpOrCancel(e),
    );
    window.addEventListener("pointercancel", (e) =>
      this.handlePlsListPointerUpOrCancel(e),
    );
  }

  private handlePlsListPointerDown(e: PointerEvent): void {
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
    const isActive = this.isPlButtonActive(btn);

    if (Number.isNaN(id) || !dataIsKeyState(currState)) {
      this.logger.error(
        `Invalid data retrieved from DOM in handlePlsListPointerDown: id: ${id}, currState: ${currState}`,
      );
      return;
    }

    if (!isActive) {
      const pointerId = e.pointerId;
      this.momentaryTimes.set(pointerId, {
        pointerId,
        type,
        btnId: id,
        startTime: Date.now(),
      });
    }

    if (type === "TALK") {
      const { tailState } = btn.dataset;
      if (!dataIsTailState(tailState)) {
        this.logger.error(
          `Invalid data retrieved from DOM in handlePlsListPointerDown: tailState: ${tailState}`,
        );
        return;
      }
      this.activeHandlers.onKeyPress({ type, id, currState, tailState });
      return;
    }
    //LISTEN:
    this.activeHandlers.onKeyPress({ type, id, currState });
  }

  private handlePlsListPointerUpOrCancel(e: PointerEvent): void {
    const momentaryTime = this.momentaryTimes.get(e.pointerId);
    if (!momentaryTime) return;

    const { type, btnId, startTime } = momentaryTime;
    this.momentaryTimes.delete(e.pointerId);
    const duration = Date.now() - startTime;

    if (duration < MOMENTARY_KEY_PRESS_TIME_MS) return;

    const btnEl = document.querySelector<HTMLButtonElement>(
      `.${type === "TALK" ? "talk" : "listen"}-btn[data-id="${btnId}"]`,
    );
    if (!btnEl) {
      this.logger.error(
        `handlePlsListPointerUpOrCancel: no btnEl found for type ${type} and btnId ${btnId}. Will do nothing`,
      );
      return;
    }
    const currState = btnEl.dataset.state;
    const isActive = this.isPlButtonActive(btnEl);

    if (!dataIsKeyState(currState)) {
      this.logger.error(
        `Invalid data retrieved from DOM in handlePlsListPointerUpOrCancel: currState: ${currState}. Will do nothing`,
      );
      return;
    }
    if (!isActive) return;

    if (type === "TALK") {
      const { tailState } = btnEl.dataset;
      if (!dataIsTailState(tailState)) {
        this.logger.error(
          `Invalid data retrieved from DOM in handlePlsListPointerUpOrCancel: tailState: ${tailState}. Will do nothing`,
        );
        return;
      }
      this.activeHandlers.onKeyPress({ type, id: btnId, currState, tailState });
      return;
    }
    //LISTEN:
    this.activeHandlers.onKeyPress({ type, id: btnId, currState });
  }

  private isPlButtonActive(btn: HTMLButtonElement): boolean {
    return (
      btn.classList.contains("talk-btn-active") ||
      btn.classList.contains("listen-btn-active")
    );
  }

  private get activeHandlers(): PanelGlobalGuiManagerHandlers {
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
