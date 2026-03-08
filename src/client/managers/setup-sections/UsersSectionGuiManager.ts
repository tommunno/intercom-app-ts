//Types:
import type {
  ManagerStatus,
  AdminUsersInfo,
  AdminUsersChangeRequest,
  AdminUsersLoggedInUpdate,
} from "../../../shared/types/index.js";
import type {
  IClientLogger,
  IUsersSectionGuiManager,
  UsersSectionGuiManagerHandlers,
} from "../../contracts/index.js";
import type {
  SetupState,
  UserSectionColumnErrs,
  UsersSectionRowChanges,
} from "../../types/index.js";
//Helpers:
import { dataIsType } from "../../../shared/helpers.js";
//Constants:
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../../../shared/constants/sharedConstants.js";

//While typing: show “changed” state only
//on blur: show field-level error locally on that field
//on save with errors: escalate to banner-level summary
//while banner is visible: keep the summary live updated on blur
//once banner is cleared: don’t re-escalate again until the next save attempt

export class UsersSectionGuiManager implements IUsersSectionGuiManager {
  private status: ManagerStatus = "IDLE";
  private readonly els = {
    section: document.querySelector<HTMLDivElement>(".users-section")!,
    banner: document.querySelector<HTMLDivElement>(".users-section-banner")!,
    tbody: document.querySelector<HTMLTableSectionElement>(
      ".user-form-table-body",
    )!,
    saveChangesBtn:
      document.querySelector<HTMLButtonElement>(".save-changes-btn")!,
  };
  private handlers: UsersSectionGuiManagerHandlers | null = null;
  private numPls: number = 0;
  private rowsChanges: UsersSectionRowChanges[] = [];
  private columnErrs: UserSectionColumnErrs = {
    usernameErr: false,
    passwordErr: false,
    allowedPlsErr: false,
  };
  private bannerErrsVisible: boolean = false;

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
    if (this.checkAndWarnIfNotRunning("display state")) {
      return;
    }
    this.logger.info("Displaying state");
    this.numPls = state.partylinesInfo.length;
    this.displayUsersInfo(state.usersInfo);
  }

  displayUsersLoggedInUpdate(update: AdminUsersLoggedInUpdate) {
    if (this.checkAndWarnIfNotRunning("display users logged in update")) {
      return;
    }
    this.logger.info("Displaying users logged in update");
    update.forEach((u) => {
      const rowChanges = this.rowsChanges[u.userId];
      if (!rowChanges) return;
      const { loggedInInput, logoutBtn } = rowChanges;
      this.populateLoginInfo(loggedInInput, logoutBtn, u.loggedIn);
    });
  }

  private displayUsersInfo(usersInfo: AdminUsersInfo): void {
    this.ensureRows(usersInfo);
    this.populateRows(usersInfo);
  }

  private ensureRows(usersInfo: AdminUsersInfo): void {
    if (usersInfo.length === this.rowsChanges.length) {
      return;
    }

    const { tbody } = this.els;

    tbody.replaceChildren();

    this.rowsChanges = [];
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

      this.rowsChanges.push({
        newUsername: null,
        newPassword: null,
        newAllowedPls: null,
        currUsername: "",
        currAllowedPls: new Set(),
        usernameError: false,
        passwordError: false,
        allowedPlsError: false,
        userInputs: {
          username: usernameInput,
          password: passwordInput,
          allowedPls: allowedPlsInput,
        },
        loggedInInput: loggedInInput,
        logoutBtn: logoutBtn,
      });
    }

    this.removeAllColumnErrs();
  }

  private populateRows(usersInfo: AdminUsersInfo): void {
    usersInfo.forEach((user, i) => {
      const rowChanges = this.rowsChanges[i];
      if (!rowChanges) {
        this.logger.error(`populateRows: Missing data: rowChanges`);
        return;
      }

      const {
        newUsername: nU,
        newPassword: nP,
        newAllowedPls: nAPls,
        userInputs: uI,
        loggedInInput,
        logoutBtn,
      } = rowChanges;

      //Only update if a change has not been made to the field,
      //or a change has been made but it matches the new value,
      //or the field is in error state:
      if (
        nU === null ||
        (nU !== null && nU === user.username) ||
        rowChanges.usernameError
      ) {
        uI.username.value = user.username;
        rowChanges.newUsername = null;
        rowChanges.usernameError = false;
        uI.username.classList.remove("input-changed", "error");
      }

      //Only update if a change has not been made to the field,
      //or the field is in error state:
      if (nP === null || rowChanges.passwordError) {
        uI.password.value = "";
        rowChanges.passwordError = false;
        uI.password.classList.remove("input-changed", "error");
      }

      const aPlsSet = new Set(user.allowedPls);

      //Only update if a change has not been made to the field,
      //or a change has been made but it matches the new value,
      //or the field is in error state:
      if (
        nAPls === null ||
        (nAPls !== null && this.doAllowedPlsMatch(nAPls, aPlsSet)) ||
        rowChanges.allowedPlsError
      ) {
        uI.allowedPls.value = this.createAllowedPlsString(user.allowedPls);
        rowChanges.newAllowedPls = null;
        rowChanges.allowedPlsError = false;
        uI.allowedPls.classList.remove("input-changed", "error");
      }

      this.populateLoginInfo(loggedInInput, logoutBtn, user.loggedIn);

      rowChanges.currUsername = user.username;
      rowChanges.currAllowedPls = aPlsSet;
    });
    //preserveNoErrState=true: errors are only added if any of the column errors are currently true
    this.calculateColumnErrs(true);
  }

  private populateLoginInfo(
    input: HTMLInputElement,
    btn: HTMLButtonElement,
    loggedIn: boolean,
  ): void {
    input.classList.toggle("active", loggedIn);
    input.value = loggedIn ? "YES" : "NO";

    btn.disabled = !loggedIn;
  }

  private setupListeners(): void {
    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    this.els.tbody.addEventListener("input", (e) =>
      this.handleTbodyInputListener(e),
    );

    this.els.tbody.addEventListener(
      "blur",
      (e) => this.handleTbodyBlurListener(e),
      true,
    );

    this.els.saveChangesBtn.addEventListener("click", (e) =>
      this.handleSaveChangesBtnClick(e),
    );
  }

  private handleTbodyInputListener(e: Event): void {
    if (e instanceof InputEvent && e.isComposing) return;
    const inputEl = e.target;
    if (!inputEl || !(inputEl instanceof HTMLInputElement)) return;

    const { id } = inputEl.dataset;
    const rowChanges = this.rowsChanges[Number(id)];
    if (!rowChanges) {
      this.logger.error(
        `handleTbodyInputListener: No rowChanges can be found for inputEl with id ${id}`,
      );
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
  }

  private handleTbodyBlurListener(e: FocusEvent): void {
    const inputEl = e.target;
    if (!inputEl || !(inputEl instanceof HTMLInputElement)) return;

    if (inputEl.classList.contains("username-input")) {
      this.handleUsernameBlurChange(inputEl);
      return;
    }
    if (inputEl.classList.contains("password-input")) {
      this.handlePasswordBlurChange(inputEl);
      return;
    }
    if (inputEl.classList.contains("allowed-pls-input")) {
      this.handleAllowedPlsBlurChange(inputEl);
      return;
    }
  }

  private handleUsernameInputChange(
    inputEl: HTMLInputElement,
    rowChanges: UsersSectionRowChanges,
  ): void {
    const trimmedName = inputEl.value.trim();
    //Visually make it look like no error once they start typing:
    inputEl.classList.remove("error");
    //Check and store if it's valid behind the scenes:
    rowChanges.usernameError = !this.isUsernameValid(trimmedName);

    //There is no change:
    if (trimmedName === rowChanges.currUsername) {
      inputEl.classList.remove("input-changed");
      rowChanges.newUsername = null;
      return;
    }
    //There is a change:
    inputEl.classList.add("input-changed");
    rowChanges.newUsername = trimmedName;
  }

  private handlePasswordInputChange(
    inputEl: HTMLInputElement,
    rowChanges: UsersSectionRowChanges,
  ): void {
    //Visually make it look like no error once they start typing:
    inputEl.classList.remove("error");
    //Check and store if it's valid behind the scenes:
    rowChanges.passwordError =
      inputEl.value !== "" && !this.isPasswordValid(inputEl.value);

    //There is no change:
    if (inputEl.value === "") {
      inputEl.classList.remove("input-changed");
      rowChanges.newPassword = null;
      return;
    }
    //There is a change:
    inputEl.classList.add("input-changed");
    rowChanges.newPassword = inputEl.value;
  }

  private handleAllowedPlsInputChange(
    inputEl: HTMLInputElement,
    rowChanges: UsersSectionRowChanges,
  ): void {
    //Visually make it look like no error once they start typing:
    inputEl.classList.remove("error");
    const aPlsSet = this.createAllowedPlsSetOrNull(inputEl.value);
    //Check and store if it's valid behind the scenes:
    //Error is true if set is null:
    rowChanges.allowedPlsError = !aPlsSet;

    //If the sets match, there is no change:
    if (aPlsSet && this.doAllowedPlsMatch(aPlsSet, rowChanges.currAllowedPls)) {
      inputEl.classList.remove("input-changed");
      rowChanges.newAllowedPls = null;
      return;
    }
    //Otherwise, there is either no aPlsSet (which means the user has typed something invalid) or the PLs don't match. Both of which mean there is a change:
    inputEl.classList.add("input-changed");
    //If there is no aPlsSet, then newAllowedPls becomes an "INVALID" value:
    rowChanges.newAllowedPls = aPlsSet ?? "INVALID";
  }

  private handleUsernameBlurChange(inputEl: HTMLInputElement): void {
    //preserveNoErrState=true: errors are only added if any of the column errors are currently true
    this.calculateColumnErrs(true);
    const trimmed = inputEl.value.trim();
    if (this.isUsernameValid(trimmed)) return;
    inputEl.classList.add("error");
    inputEl.classList.remove("input-changed");
  }

  private handlePasswordBlurChange(inputEl: HTMLInputElement): void {
    //preserveNoErrState=true: errors are only added if any of the column errors are currently true
    this.calculateColumnErrs(true);
    if (inputEl.value === "" || this.isPasswordValid(inputEl.value)) return;
    inputEl.classList.add("error");
    inputEl.classList.remove("input-changed");
  }

  private handleAllowedPlsBlurChange(inputEl: HTMLInputElement): void {
    //preserveNoErrState=true: errors are only added if any of the column errors are currently true
    this.calculateColumnErrs(true);
    const aPlsSet = this.createAllowedPlsSetOrNull(inputEl.value);
    if (aPlsSet) return;
    inputEl.classList.add("error");
    inputEl.classList.remove("input-changed");
  }

  private isUsernameValid(name: string): boolean {
    return name !== "" && name.length <= MAX_USERNAME_LENGTH;
  }

  private isPasswordValid(password: string): boolean {
    return (
      password.length >= MIN_PASSWORD_LENGTH &&
      password.length <= MAX_PASSWORD_LENGTH
    );
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

  private doAllowedPlsMatch(
    aPlA: Set<number> | "INVALID",
    aPlB: Set<number> | "INVALID",
  ): boolean {
    // INVALID never matches, even with another INVALID
    // (similar to how NaN !== NaN)
    if (aPlA === "INVALID" || aPlB === "INVALID") {
      return false;
    }
    if (aPlA.size !== aPlB.size) {
      return false;
    }
    for (const value of aPlA) {
      if (!aPlB.has(value)) {
        return false;
      }
    }
    return true;
  }

  private isPlValid(pl: number): boolean {
    const isValid =
      dataIsType("safeIntegerNum", pl) && pl >= 0 && pl < this.numPls;
    return isValid;
  }

  private handleSaveChangesBtnClick(e: PointerEvent): void {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const areErrs = this.calculateColumnErrs();
    if (areErrs) {
      this.displayInputErrs();
      return;
    }
    this.sendChanges();
    this.removeAllColumnErrs();
  }

  private sendChanges(): void {
    const changeRequest: AdminUsersChangeRequest = [];
    this.rowsChanges.forEach((rowChange, i) => {
      const {
        newUsername: username,
        newPassword: password,
        newAllowedPls: nAPls,
      } = rowChange;

      let allowedPls: number[] | null = null;
      if (nAPls && nAPls !== "INVALID") {
        allowedPls = Array.from(nAPls);
      }

      changeRequest.push({
        userId: i,
        username,
        password,
        allowedPls,
      });
      // Keep pending username / allowed PL edits until fresh server state arrives,
      // so populateRows() can reconcile them against the returned snapshot.
      // Clear password change immediately (since there is no way to track 'changes' from the server for this field)
      rowChange.newPassword = null;
    });
    this.activeHandlers.onUpdate(changeRequest);
  }

  //If preserveNoErrState=true, then errors are only added if any of the column errors are currently true
  //Function also returns whether there are errors:
  private calculateColumnErrs(preserveNoErrState: boolean = false): boolean {
    if (
      preserveNoErrState &&
      !Object.values(this.columnErrs).some((err) => err)
    ) {
      return false;
    }
    let usernameErr = false;
    let passwordErr = false;
    let allowedPlsErr = false;
    this.rowsChanges.forEach((rowChanges) => {
      if (rowChanges.usernameError) {
        usernameErr = true;
      }
      if (rowChanges.passwordError) {
        passwordErr = true;
      }
      if (rowChanges.allowedPlsError) {
        allowedPlsErr = true;
      }
    });

    this.columnErrs = { usernameErr, passwordErr, allowedPlsErr };

    this.displayColumnErrs();

    return usernameErr || passwordErr || allowedPlsErr;
  }
  private removeAllColumnErrs(): void {
    this.columnErrs = {
      usernameErr: false,
      passwordErr: false,
      allowedPlsErr: false,
    };
    this.displayColumnErrs();
  }

  private displayColumnErrs(): void {
    const { banner } = this.els;
    const {
      usernameErr: uE,
      passwordErr: pE,
      allowedPlsErr: aPlsE,
    } = this.columnErrs;
    //Hiding:
    if (!uE && !pE && !aPlsE) {
      banner.classList.remove("visible");
      this.bannerErrsVisible = false;
      return;
    }
    //Showing:
    banner.classList.remove("success", "info", "no-messages");
    banner.classList.add("error", "visible");
    const p = banner.querySelector<HTMLParagraphElement>(
      ".section-banner-title",
    );
    const bannerMessages = banner.querySelector<HTMLUListElement>(
      ".section-banner-messages",
    );
    if (p) p.textContent = "Field Errors";
    if (bannerMessages) {
      bannerMessages.innerHTML = "";
      if (uE) {
        const li = document.createElement("li");
        li.textContent = `Username must be 1-${MAX_USERNAME_LENGTH} characters`;
        bannerMessages.appendChild(li);
      }
      if (pE) {
        const li = document.createElement("li");
        li.textContent = `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`;
        bannerMessages.appendChild(li);
      }
      if (aPlsE) {
        const li = document.createElement("li");
        li.textContent = `Allowed PLs must be 1-${this.numPls} in format '2, 4-6, 8'`;
        bannerMessages.appendChild(li);
      }
    }
    if (!this.bannerErrsVisible) {
      const offset = 20;
      const top =
        banner.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({
        top,
        behavior: "smooth",
      });
    }
    this.bannerErrsVisible = true;
  }

  private displayInputErrs(): void {
    this.rowsChanges.forEach((rowChanges) => {
      const { userInputs: uI } = rowChanges;

      uI.username.classList.toggle("error", rowChanges.usernameError);
      if (rowChanges.usernameError) {
        uI.username.classList.remove("input-changed");
      }
      uI.password.classList.toggle("error", rowChanges.passwordError);
      if (rowChanges.passwordError) {
        uI.password.classList.remove("input-changed");
      }
      uI.allowedPls.classList.toggle("error", rowChanges.allowedPlsError);
      if (rowChanges.allowedPlsError) {
        uI.allowedPls.classList.remove("input-changed");
      }
    });
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
