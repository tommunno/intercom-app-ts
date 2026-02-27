import type {
  KeyPressInfo,
  ManagerStatus,
  TailState,
} from "../../../shared/types/index.js";
import {
  DEFAULT_NUM_PARTYLINES,
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
  SHORT_TAIL_TIME_MS,
} from "../../constants/serverConstants.js";
import type {
  ITailManager,
  ILogger,
  TailHandlers,
  TailConfig,
} from "../../contracts/index.js";
import type { LongTailInfo, ShortTailInfo } from "../../types/index.js";

const BLANK_TAIL_CONFIG: TailConfig = {
  numUsers: 0,
  numSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
  numPartylines: DEFAULT_NUM_PARTYLINES,
};

export class TailManager implements ITailManager {
  private _status: ManagerStatus = "IDLE";
  private handlers: TailHandlers | null = null;
  private context: string = "TailManager";

  private config: TailConfig = { ...BLANK_TAIL_CONFIG };
  private numPorts: number = 0;
  private longTails: (LongTailInfo | null)[] = [];
  //An array of shortTailInfos for each port. A shortTailInfo for each partyline:
  private shortTails: (ShortTailInfo | null)[][] = [];

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: this.context });
  }

  init(): void {
    if (this._status !== "IDLE") {
      throw new Error(
        `Cannot initialize the ${this.context} whilst its status is ${this._status}`,
      );
    }
    this._status = "INITIALIZED";
  }

  populate(config: TailConfig): void {
    if (this._status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the ${this.context} whilst its status is ${this._status}`,
      );
    }
    this.config = { ...config };
    this.numPorts = this.config.numUsers + this.config.numSoundcardChannels;
    this.createLongTails();
    this.createShortTails();
    this._status = "POPULATED";
  }

  start(): void {
    if (this._status !== "POPULATED") {
      throw new Error(
        `Cannot start the ${this.context} whilst its status is ${this._status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this._status = "RUNNING";
  }

  setHandlers(handlers: TailHandlers): void {
    this.handlers = handlers;
  }

  //Make sure to clear timeouts in here!
  stop(): void {
    if (this._status === "IDLE" || this._status === "INITIALIZED") {
      return;
    }
    this._status = "INITIALIZED";
    this.resetRuntimeFields();
  }

  getTailState(userId: number, plNum: number): TailState {
    if (this.checkAndWarnIfNotRunning("get tail state")) {
      return "NONE";
    }
    const errMessage = `Unable to get tail state for userId ${userId} and plNum ${plNum}`;

    const longTail = this.longTails[userId];
    const shortTail = this.shortTails[userId]?.[plNum];
    if (longTail === undefined) {
      this.logger.error(errMessage + ": Cannot find longTail");
      return "NONE";
    }
    if (shortTail === undefined) {
      this.logger.error(errMessage + ": Cannot find shortTail");
      return "NONE";
    }
    if (longTail?.plNum === plNum && shortTail?.plNum === plNum) {
      this.logger.error(
        `getTailState: Invariant violation: longTail and shortTail both exist for userId ${userId} and plNum ${plNum}. Will return the long tail only`,
      );
    }
    return longTail?.plNum === plNum
      ? "LONG"
      : shortTail?.plNum === plNum
        ? "SHORT"
        : "NONE";
  }

  //This provides the virtualized layer in front of the audio matrix, where we can control tails etc
  processKeyPress(portNum: number, keyPressInfo: KeyPressInfo): void {
    if (this.checkAndWarnIfNotRunning("process key press")) {
      return;
    }
    const { type, id, setState } = keyPressInfo;
    const errMessage = `Unable to set partyline ${id} ${type} key to ${setState} for portNum ${portNum}`;

    if (!this.isPortNumAndPlNumValid(portNum, id, errMessage)) {
      return;
    }

    const longTail = this.longTails[portNum];
    if (longTail === undefined) {
      this.logger.error(
        errMessage +
          `: Invariant violation: unable to find longTail. Will do nothing`,
      );
      return;
    }
    const shortTail = this.shortTails[portNum]?.[id];
    if (shortTail === undefined) {
      this.logger.error(
        errMessage +
          `: Invariant violation: unable to find shortTail. Will do nothing`,
      );
      return;
    }
    if (longTail && shortTail) {
      this.logger.error(
        errMessage +
          `: Invariant violation: longTail and shortTail both exist. Will do nothing`,
      );
      return;
    }

    if (type === "LISTEN") {
      this.activeHandlers.onKeyPress(portNum, keyPressInfo);
      this.activeHandlers.onUpdateAudioInfo(portNum);
      return;
    }
    //type === TALK:
    const portCurrentlyTalking = this.activeHandlers.onIsPortTalkingToPartyline(
      portNum,
      id,
    );

    //TURNING TALK KEY ON:
    if (setState === "ON") {
      if (portCurrentlyTalking) {
        //If the port is already talking, and the longTail for this port is not relating to this partyline, and there's no shortTail, do nothing:
        if (longTail?.plNum !== id && !shortTail) {
          this.logger.warn(
            errMessage + ": port is already talking to partyline",
          );
          return;
        }
        if (longTail) {
          //If the port is already talking, and the longTail relates to this partyline, then we want to remove the longTail, but we don't want to turn off the key:
          this.removeLongTail(longTail, false);
          this.activeHandlers.onUpdateAudioInfo(portNum);
          return;
        }
        if (shortTail) {
          //If the port is already talking, and there is a shortTail, then we want to remove the shortTail, but we don't want to turn off the key:
          this.removeShortTail(shortTail, false);
          this.activeHandlers.onUpdateAudioInfo(portNum);
          return;
        }
      }
      //Otherwise we remove the longTail if it exists, which includes turning off the key it related to:
      if (longTail) {
        this.removeLongTail(longTail);
      }
      //And same thing for the shortTail:
      if (shortTail) {
        this.removeShortTail(shortTail);
      }

      //Then we turn on the key!
      this.activeHandlers.onKeyPress(portNum, keyPressInfo);
      this.activeHandlers.onUpdateAudioInfo(portNum);
      return;
    }

    //TURNING TALK KEY OFF:
    if (!portCurrentlyTalking) {
      this.logger.warn(errMessage + ": port is not talking to partyline");
      return;
    } else if (longTail) {
      this.logger.warn(
        errMessage + ": a longTail is active for this port and partyline",
      );
      return;
    }

    const onlyKey = this.activeHandlers.onIsSoleActiveTalkKeyForPort(
      portNum,
      id,
    );
    this.logger.info("onlyKey:", onlyKey);
    //If this is the only talk key that's currently active for this port, we add a long tail:
    if (onlyKey) {
      this.addLongTail(portNum, id);
      this.activeHandlers.onUpdateAudioInfo(portNum);
      return;
    }
    //Otherwise we add a short tail:
    this.addShortTail(portNum, id);
    this.activeHandlers.onUpdateAudioInfo(portNum);
  }

  private removeLongTail(longTail: LongTailInfo, turnOffKey: boolean = true) {
    const { portNum, plNum, startTimestamp } = longTail;
    if (turnOffKey) {
      //If less time has elapsed than the duration of a short tail, then add a short tail for the remaining duration
      //This ensures that a long tail never ends up being shorter than a regular short tail in practice:
      const timeElapsed = Date.now() - startTimestamp;
      if (timeElapsed < SHORT_TAIL_TIME_MS) {
        this.addShortTail(portNum, plNum, SHORT_TAIL_TIME_MS - timeElapsed);
        this.longTails[portNum] = null;
        return;
      }
      //Otherwise, turn off the talk key
      this.activeHandlers.onKeyPress(portNum, {
        type: "TALK",
        id: plNum,
        setState: "OFF",
      });
    }
    this.longTails[portNum] = null;
  }

  private removeShortTail(
    shortTail: ShortTailInfo,
    turnOffKey: boolean = true,
  ) {
    const { portNum, plNum, timeoutId } = shortTail;
    clearTimeout(timeoutId);
    if (turnOffKey) {
      this.activeHandlers.onKeyPress(portNum, {
        type: "TALK",
        id: plNum,
        setState: "OFF",
      });
    }
    const shortTails = this.shortTails[portNum];
    if (!shortTails) {
      this.logger.error(
        `removeShortTail: Invariant violation: shortTails doesn't exist. The key has been turned off but the shortTail info will not be removed`,
      );
      return;
    }
    shortTails[plNum] = null;
  }

  get status(): ManagerStatus {
    return this._status;
  }

  private addLongTail(portNum: number, plNum: number): void {
    const errMessage = `Unable to add long tail for portNum ${portNum} and plNum ${plNum}`;

    if (!this.isPortNumAndPlNumValid(portNum, plNum, errMessage)) {
      return;
    }

    if (this.longTails[portNum]) {
      this.logger.error(
        `addLongTail: Invariant violation: a long tail already exists for portNum ${portNum} and plNum ${plNum}. Will remove the old longTail and add the new one`,
      );
    }

    this.longTails[portNum] = {
      portNum,
      plNum,
      startTimestamp: Date.now(),
    };
  }

  private addShortTail(
    portNum: number,
    plNum: number,
    timeMs: number = SHORT_TAIL_TIME_MS,
  ): void {
    const errMessage = `Unable to add short tail for portNum ${portNum} and plNum ${plNum}`;

    if (!this.isPortNumAndPlNumValid(portNum, plNum, errMessage)) {
      return;
    }

    const shortTails = this.shortTails[portNum];
    const tail = shortTails?.[plNum];
    if (!shortTails || tail === undefined) {
      this.logger.error(
        errMessage +
          `: addShortTail: Invariant violation: unable to find tail slot`,
      );
      return;
    }
    if (tail !== null) {
      this.logger.error(
        errMessage +
          `: addShortTail: There already is a shortTail for the port and PL. Will do nothing`,
      );
      return;
    }
    const timeoutId = setTimeout(
      () => this.handleShortTailEnd(portNum, plNum),
      timeMs,
    );

    shortTails[plNum] = {
      portNum,
      plNum,
      startTimestamp: Date.now(),
      timeoutId,
    };
  }

  private handleShortTailEnd(portNum: number, plNum: number): void {
    const shortTails = this.shortTails[portNum];
    if (!shortTails) {
      this.logger.error(
        `handleShortTailEnd: Invariant violation: unable to find shortTails. Will do nothing`,
      );
      return;
    }
    shortTails[plNum] = null;
    const onlyKey = this.activeHandlers.onIsSoleActiveTalkKeyForPort(
      portNum,
      plNum,
    );
    //If this is the only talk key that's currently active for this port, we add a long tail:
    if (onlyKey) {
      this.addLongTail(portNum, plNum);
      this.activeHandlers.onUpdateAudioInfo(portNum);
      return;
    }
    //Otherwise, we turn off the key:
    this.activeHandlers.onKeyPress(portNum, {
      type: "TALK",
      id: plNum,
      setState: "OFF",
    });
    this.activeHandlers.onUpdateAudioInfo(portNum);
  }

  private createLongTails(): void {
    this.longTails = Array.from({ length: this.numPorts }, () => null);
  }

  private createShortTails(): void {
    this.shortTails = Array.from({ length: this.numPorts }, () => {
      return Array.from({ length: this.config.numPartylines }, () => null);
    });
  }

  private isPortNumAndPlNumValid(
    portNum: number,
    plNum: number,
    errMessage: string,
  ): boolean {
    if (!this.isPortNumValid(portNum)) {
      this.logger.warn(errMessage + ": portNum is invalid");
      return false;
    }
    if (!this.isPlNumValid(plNum)) {
      this.logger.warn(errMessage + ": plNum is invalid");
      return false;
    }
    return true;
  }

  private isPortNumValid(portNum: number): boolean {
    return (
      Number.isSafeInteger(portNum) && portNum >= 0 && portNum < this.numPorts
    );
  }

  private isPlNumValid(plNum: number): boolean {
    return (
      Number.isSafeInteger(plNum) &&
      plNum >= 0 &&
      plNum < this.config.numPartylines
    );
  }

  private resetRuntimeFields(): void {
    this.config = { ...BLANK_TAIL_CONFIG };
    this.longTails = [];
    this.shortTails = [];
  }

  private get activeHandlers(): TailHandlers {
    if (!this.handlers)
      throw new Error(`${this.context} handlers not initialized!`);
    return this.handlers;
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
