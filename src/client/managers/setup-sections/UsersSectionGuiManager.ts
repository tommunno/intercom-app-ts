//Types:
import type {
  ManagerStatus,
  AdminUsersInfo,
} from "../../../shared/types/index.js";
import type {
  IClientLogger,
  IUsersSectionGuiManager,
  UsersSectionGuiManagerHandlers,
} from "../../contracts/index.js";
import type { SetupState, UsersSectionRowChanges } from "../../types/index.js";
//Helpers:
import { dataIsType } from "../../../shared/helpers.js";
import { MAX_USERNAME_LENGTH } from "../../../shared/constants/sharedConstants.js";

export class UsersSectionGuiManager implements IUsersSectionGuiManager {
  private status: ManagerStatus = "IDLE";
  private readonly els = {
    section: document.querySelector<HTMLDivElement>(".users-section")!,
    tbody: document.querySelector<HTMLTableSectionElement>(
      ".user-form-table-body",
    )!,
    saveChangesBtn:
      document.querySelector<HTMLDivElement>(".save-changes-btn")!,
  };
  private handlers: UsersSectionGuiManagerHandlers | null = null;
  private rowChanges: UsersSectionRowChanges[] = [];
  private numPls: number = 0;

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "UsersSectionGuiManager" });
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
        `Cannot initialize the UsersSectionGuiManager whilst its status is ${this.status}`,
      );
    }
    this.ensureElementsExist();
    this.status = "INITIALIZED";
  }
  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the UsersSectionGuiManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.setupListeners();
    this.status = "RUNNING";
  }

  setHandlers(handlers: UsersSectionGuiManagerHandlers): void {
    this.handlers = handlers;
  }

  displayState(state: SetupState): void {
    this.logger.info("Displaying state");
    this.numPls = state.partylinesInfo.length;
    this.displayUsersInfo(state.usersInfo);
  }

  displayUsersInfo(usersInfo: AdminUsersInfo): void {
    this.ensureRows(usersInfo);
    this.populateRows(usersInfo);
  }

  private ensureRows(usersInfo: AdminUsersInfo): void {
    if (usersInfo.length === this.rowChanges.length) {
      return;
    }

    const { tbody } = this.els;

    tbody.replaceChildren();

    for (let i = 0; i < usersInfo.length; i++) {
      const tr = document.createElement("tr");

      const id = String(i);

      // Col 1: number
      const tdNum = document.createElement("td");
      const pNum = document.createElement("p");
      pNum.className = "user-number";
      pNum.textContent = String(i + 1);
      tdNum.appendChild(pNum);

      // Col 2: username
      const tdUsername = document.createElement("td");
      const usernameInput = document.createElement("input");
      usernameInput.dataset.type = "username";
      usernameInput.dataset.id = id;
      usernameInput.className = "username-input";
      usernameInput.type = "text";
      usernameInput.name = "Username";
      usernameInput.autocomplete = "username";
      tdUsername.appendChild(usernameInput);

      // Col 3: password
      const tdPassword = document.createElement("td");
      const passwordInput = document.createElement("input");
      passwordInput.dataset.type = "password";
      passwordInput.dataset.id = id;
      passwordInput.className = "password-input";
      passwordInput.type = "password";
      passwordInput.name = "Password";
      passwordInput.autocomplete = "new-password";
      passwordInput.placeholder = "New password";
      tdPassword.appendChild(passwordInput);

      // Col 4: allowed PLs
      const tdAllowedPls = document.createElement("td");
      const allowedPlsInput = document.createElement("input");
      allowedPlsInput.dataset.type = "allowed-pls";
      allowedPlsInput.dataset.id = id;
      allowedPlsInput.className = "allowed-pls-input";
      allowedPlsInput.type = "text";
      allowedPlsInput.name = "Allowed PLs";
      allowedPlsInput.autocomplete = "off";
      allowedPlsInput.placeholder = "2, 4-6, 8";
      tdAllowedPls.appendChild(allowedPlsInput);

      // Col 5: logged in + button
      const tdLoggedIn = document.createElement("td");
      tdLoggedIn.className = "user-logged-in-setting-td";

      const loggedInInput = document.createElement("input");
      loggedInInput.className = "user-logged-in-input";
      loggedInInput.dataset.id = id;
      loggedInInput.type = "text";
      loggedInInput.name = "User Logged In";
      loggedInInput.autocomplete = "off";
      loggedInInput.disabled = true;

      const logoutBtn = document.createElement("button");
      logoutBtn.type = "button";
      logoutBtn.className = "log-out-user-btn btn";
      logoutBtn.dataset.id = id;
      logoutBtn.textContent = "Log Out User";

      tdLoggedIn.append(loggedInInput, logoutBtn);

      tr.append(tdNum, tdUsername, tdPassword, tdAllowedPls, tdLoggedIn);
      tbody.appendChild(tr);
    }
    this.rowChanges = Array.from({ length: usersInfo.length }, () => ({
      newUsername: null,
      newPassword: null,
      newAllowedPls: null,
      currUsername: "",
      currAllowedPls: "",
    }));
  }

  private populateRows(usersInfo: AdminUsersInfo): void {
    const { tbody } = this.els;

    for (let i = 0; i < usersInfo.length; i++) {
      const user = usersInfo[i];
      const tr = tbody.rows[i];
      const rowChanges = this.rowChanges[i];
      if (!user || !tr || !rowChanges) {
        this.logger.error(
          `populateRows: Missing data: user: ${user}, tr: ${tr}, rowChanges: ${rowChanges}`,
        );
        return;
      }

      const usernameInput =
        tr.querySelector<HTMLInputElement>(".username-input");
      const passwordInput =
        tr.querySelector<HTMLInputElement>(".password-input");
      const allowedPlsInput =
        tr.querySelector<HTMLInputElement>(".allowed-pls-input");
      const loggedInInput = tr.querySelector<HTMLInputElement>(
        ".user-logged-in-input",
      );
      const logoutBtn =
        tr.querySelector<HTMLButtonElement>(".log-out-user-btn");

      const {
        newUsername: nU,
        newPassword: nP,
        newAllowedPls: nAPls,
      } = rowChanges;

      if (usernameInput) {
        //Only update if a change has not been made to the field,
        //or a change has been made but it matches the new value:
        if (nU === null || (nU !== null && nU === user.username)) {
          usernameInput.value = user.username;
          usernameInput.classList.remove("input-changed");
          rowChanges.newUsername = null;
        }
      }

      if (passwordInput) {
        //Only update if a change has not been made to the field:
        if (nP === null) {
          passwordInput.value = "";
        }
      }

      const userAllowedPls = this.createAllowedPlsString(user.allowedPls);

      if (allowedPlsInput) {
        let changeMatchesNewValue = false;
        if (nAPls) {
          const nAPlsSet = this.createAllowedPlsSetOrNull(nAPls);
          if (nAPlsSet) {
            changeMatchesNewValue = this.doSetsMatch(
              nAPlsSet,
              new Set(user.allowedPls),
            );
          }
        }
        //Only update if a change has not been made to the field,
        //or a change has been made but it matches the new value:
        if (nAPls === null || (nAPls !== null && changeMatchesNewValue)) {
          allowedPlsInput.value = userAllowedPls;
          allowedPlsInput.classList.remove("input-changed");
          rowChanges.newAllowedPls = null;
        }
      }

      if (loggedInInput) loggedInInput.value = user.loggedIn ? "YES" : "NO";

      if (logoutBtn) {
        logoutBtn.disabled = !user.loggedIn;
      }

      rowChanges.currUsername = user.username;
      rowChanges.currAllowedPls = userAllowedPls;
    }
  }

  private setupListeners(): void {
    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    this.els.tbody.addEventListener("input", (e) => {
      if (e instanceof InputEvent && e.isComposing) return;
      const inputEl = e.target;
      if (!inputEl || !(inputEl instanceof HTMLInputElement)) return;

      const { id } = inputEl.dataset;
      const rowChanges = this.rowChanges[Number(id)];
      if (!rowChanges) {
        this.logger.error(`No rowChanges can be found inputEl with id ${id}`);
        return;
      }

      if (inputEl.classList.contains("username-input")) {
        this.handleUsernameInputChange(inputEl, rowChanges);
        return;
      }
      if (inputEl.classList.contains("password-input")) {
        this.handlePasswordInputChange(inputEl, rowChanges);
        return;
      }
      if (inputEl.classList.contains("allowed-pls-input")) {
        this.handleAllowedPlsInputChange(inputEl, rowChanges);
        return;
      }
    });

    this.els.saveChangesBtn.addEventListener("click", (e) =>
      this.handleSaveChangesBtnClick(e),
    );
  }

  private handleUsernameInputChange(
    inputEl: HTMLInputElement,
    rowChanges: UsersSectionRowChanges,
  ): void {
    const trimmedName = inputEl.value.trim();
    const isValid = this.isUsernameValid(trimmedName);
    if (!isValid) {
      inputEl.classList.add("error");
      rowChanges.newUsername = null;
      inputEl.classList.remove("input-changed");
      return;
    }
    inputEl.classList.remove("error");
    //There is no change:
    if (inputEl.value === rowChanges.currUsername) {
      inputEl.classList.remove("input-changed");
      rowChanges.newUsername = null;
      return;
    }
    //There is a change:
    inputEl.classList.add("input-changed");
    rowChanges.newUsername = trimmedName;
    return;
  }

  private handlePasswordInputChange(
    inputEl: HTMLInputElement,
    rowChanges: UsersSectionRowChanges,
  ): void {
    //There is no change:
    if (inputEl.value === "") {
      inputEl.classList.remove("input-changed");
      rowChanges.newPassword = null;
      return;
    }
    //There is a change:
    inputEl.classList.add("input-changed");
    rowChanges.newPassword = inputEl.value;
    return;
  }

  private handleAllowedPlsInputChange(
    inputEl: HTMLInputElement,
    rowChanges: UsersSectionRowChanges,
  ): void {
    const allowedPlsSet = this.createAllowedPlsSetOrNull(inputEl.value);
    if (!allowedPlsSet) {
      inputEl.classList.add("error");
      rowChanges.newAllowedPls = null;
      inputEl.classList.remove("input-changed");
      return;
    }
    inputEl.classList.remove("error");
    const allowedPlsStr = this.createAllowedPlsString([...allowedPlsSet]);
    //There is no change:
    if (allowedPlsStr === rowChanges.currAllowedPls) {
      inputEl.classList.remove("input-changed");
      rowChanges.newAllowedPls = null;
      return;
    }
    //There is a change:
    inputEl.classList.add("input-changed");
    rowChanges.newAllowedPls = allowedPlsStr;
    return;
  }

  private isUsernameValid(name: string): boolean {
    return name !== "" && name.length <= MAX_USERNAME_LENGTH;
  }

  private createAllowedPlsString(allowedPls: number[]): string {
    if (allowedPls.length === 0) return "";

    const pls = Array.from(new Set(allowedPls))
      .filter((n) => n >= 0)
      .sort((a, b) => a - b);

    const plRanges: number[][] = [];

    let currentRange: number[] = [];

    pls.forEach((pl) => {
      const lastValInRange = currentRange.at(-1);
      //If currentRange is empty, add in the pl to it:
      if (lastValInRange === undefined) {
        currentRange.push(pl);
        return;
      }
      //If currentRange has something in, if the pl is one more than the last value, add it to the currentRange array:
      if (pl === lastValInRange + 1) {
        currentRange.push(pl);
        return;
      }
      //Otherwise, push the currentRange array into plRanges, and initialize the currentRange arr with pl:
      plRanges.push(currentRange);
      currentRange = [pl];
    });
    plRanges.push(currentRange);

    let result = "";
    plRanges.forEach((plRange, i) => {
      const firstVal = plRange[0];
      if (firstVal === undefined) {
        this.logger.error(
          `createAllowedPlsString: Invariant violation: firstVal is undefined for plRange and index ${i}`,
        );
        return;
      }
      if (i !== 0) {
        result += ", ";
      }
      //+1 because Pls start at index 1 for the user!:
      result += String(firstVal + 1);

      if (plRange.length <= 1) return;

      const lastVal = plRange.at(-1);
      if (lastVal !== undefined) {
        //+1 because Pls start at index 1 for the user!:
        result += "-" + String(lastVal + 1);
      }
    });
    return result;
  }

  private createAllowedPlsSetOrNull(inputStr: string): Set<number> | null {
    const trimmedInputStr = inputStr.trim();
    if (trimmedInputStr === "") return new Set();
    const ranges: string[] = trimmedInputStr.split(",");
    const output: Set<number> = new Set();
    let rangeArr: string[];
    for (const range of ranges) {
      rangeArr = range.split("-");
      let lastVal: number | null = null;
      for (const val of rangeArr) {
        const trimmed = val.trim();
        if (trimmed === "") continue;
        //Take one away from the user provided value, because pls are indexed as 1 for the user, and as 0 for the backend:
        const numVal = Number(trimmed) - 1;
        if (!this.isPlValid(numVal)) {
          return null;
        }
        if (lastVal === null) {
          output.add(numVal);
          lastVal = numVal;
          continue;
        }
        const amountToAdd = numVal - lastVal;
        if (amountToAdd <= 0) {
          this.logger.warn(
            `createAllowedPlsSetOrNull: Invalid value: the last value in a range needs to be greater than the first value`,
          );
          return null;
        }
        for (let i = 0; i < amountToAdd; i++) {
          output.add(lastVal + i + 1);
        }
        lastVal = numVal;
      }
    }
    return output;
  }

  private doSetsMatch(a: Set<number>, b: Set<number>): boolean {
    return a.size === b.size && [...a].every((value) => b.has(value));
  }

  private isPlValid(pl: number): boolean {
    const isValid =
      dataIsType("safeIntegerNum", pl) && pl >= 0 && pl < this.numPls;
    if (!isValid) {
      this.logger.warn(`isPlValid: Invalid pl ${pl}`);
    }
    return isValid;
  }

  private handleSaveChangesBtnClick(e: PointerEvent): void {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  private get activeHandlers(): UsersSectionGuiManagerHandlers {
    if (!this.handlers)
      throw new Error("UsersSectionGuiManager handlers not initialized!");
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
