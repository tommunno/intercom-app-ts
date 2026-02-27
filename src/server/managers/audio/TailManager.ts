//Types:
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
import type {
  LongTailInfo,
  ShortTailInfo,
  TailInfo,
} from "../../types/index.js";
//Other Imports:
import { performance } from "node:perf_hooks";

const BLANK_TAIL_CONFIG: TailConfig = {
  numUsers: 0,
  numSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
  numPartylines: DEFAULT_NUM_PARTYLINES,
};

//The idea behind this Manager is to help mitigate client latency issues.
//Without this layer in front of the AudioMatrixManager, if a client turned off a talk key, with that command arriving at the server practically straight away, but the audio arriving for example a second later,
//the end of the audio would be cut off, because we would have opened the crosspoint before the audio had finished.
//To solve/mitigate this, the below logic is implemented:
//If only one talk key is active, and the user wants to turn it off,
//What actually happens is that the client locally mutes its mic, and the crosspoint stays open on the server (in 'LongTail' state)
//This means that no audio is cut off, even if it arrived multiple seconds late.
//LongTails are cancelled as soon as any talk key is pressed (at which point the client mic is locally unmuted)
//If more than one talk key is on, and we turn off one of those keys, we can't locally mute the client mic, because it's needed for the other talk keys.
//So instead, we put that talk key into a 'ShortTail' state. This means that the crosspoint is still closed,
//But a timer is set with the duration of the SHORT_TAIL_TIME_MS serverConstant.
//Once the timer finishes, the tail expires to no tail IF no other keys that AREN'T in short or longTail mode are currently pressed
//Otherwise it expires to a LongTail (because the client mic can now be muted, so we get all the benefits of a longTail)
//The final point of note is that, if a longTail that has been active for a duration of LESS than that of a shortTail is about to be turned off, we instead convert it into a shortTail, set with a duration to ensure the entire tail time matches that of a short tail. This way, we can't have any tail being shorter than a shortTail.

//Practically, this means that a lot of the time when a user stops talking, audio goes to LongTail state which means no audio will be clipped even if on bad internet
//However, if a user stops talking on one partyline whilst still talking on another, then the audio for that partyline just gets turned off SHORT_TAIL_TIME_MS later, to account for audio delay and to help reduce the chance of audio getting cut off.

export class TailManager implements ITailManager {
  private _status: ManagerStatus = "IDLE";
  private handlers: TailHandlers | null = null;
  private context: string = "TailManager";

  private config: TailConfig = { ...BLANK_TAIL_CONFIG };
  private numPorts: number = 0;
  //An array of TailInfos for each port. A TailInfo for each partyline:
  private tails: TailInfo[][] = [];

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
    this.createTails();
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

  stop(): void {
    if (this._status === "IDLE" || this._status === "INITIALIZED") {
      return;
    }
    this.clearShortTailTimeouts();
    this.resetRuntimeFields();
    this._status = "INITIALIZED";
  }

  getTailState(userId: number, plNum: number): TailState {
    if (this.checkAndWarnIfNotRunning("get tail state")) {
      return "NONE";
    }
    const errMessage = `Unable to get tail state for userId ${userId} and plNum ${plNum}`;

    const tail = this.tails[userId]?.[plNum];
    if (tail === undefined) {
      this.logger.error(errMessage + ": Cannot find tail");
      return "NONE";
    }
    return tail.type;
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

    const portTails = this.tails[portNum];
    if (portTails === undefined) {
      this.logger.error(
        errMessage +
          `: Invariant violation: unable to find portTails. Will do nothing`,
      );
      return;
    }

    const tail = portTails[id];
    if (tail === undefined) {
      this.logger.error(
        errMessage +
          `: Invariant violation: unable to find tail. Will do nothing`,
      );
      return;
    }

    if (type === "LISTEN") {
      this.activeHandlers.onKeyPress(portNum, keyPressInfo);
      this.activeHandlers.onUpdateAudioInfo(portNum);
      return;
    }
    //type === TALK:
    //TURNING TALK KEY ON:
    if (setState === "ON") {
      this.processTalkKeyOn(portNum, keyPressInfo, tail, portTails, errMessage);
      return;
    }
    //TURNING TALK KEY OFF:
    this.processTalkKeyOff(portNum, keyPressInfo, tail, portTails, errMessage);
  }

  private processTalkKeyOn(
    portNum: number,
    keyPressInfo: KeyPressInfo,
    tail: TailInfo,
    portTails: TailInfo[],
    errMessage: string,
  ): void {
    const { id } = keyPressInfo;

    const portCurrentlyTalking = this.activeHandlers.onIsPortTalkingToPartyline(
      portNum,
      id,
    );
    if (portCurrentlyTalking) {
      //If the port is already talking, and there is no tail, do nothing:
      if (tail.type === "NONE") {
        this.logger.warn(errMessage + ": port is already talking to partyline");
        return;
      }
      if (tail.type === "LONG") {
        //If the port is already talking, and there is a longTail, then we want to remove all longTails for the port, and we pass in the tail that we DON'T want the key to be turned off for:
        this.removeAllLongTailsForPort(portTails, tail);
        this.activeHandlers.onUpdateAudioInfo(portNum);
        return;
      }
      //SHORT:
      //If the port is already talking, and there is a shortTail, then we want to remove the shortTail, but we don't want to turn off the key:
      this.removeShortTail(tail, portTails, false);
      //And we also remove all longTails for the port:
      this.removeAllLongTailsForPort(portTails);
      this.activeHandlers.onUpdateAudioInfo(portNum);
      return;
    }
    //Otherwise we remove all longTails for the port:
    this.removeAllLongTailsForPort(portTails);

    //And we remove the short tail if it exists:
    if (tail.type === "SHORT") {
      this.removeShortTail(tail, portTails);
    }

    //Then we turn on the key!
    this.activeHandlers.onKeyPress(portNum, keyPressInfo);
    this.activeHandlers.onUpdateAudioInfo(portNum);
    return;
  }

  private processTalkKeyOff(
    portNum: number,
    keyPressInfo: KeyPressInfo,
    tail: TailInfo,
    portTails: TailInfo[],
    errMessage: string,
  ): void {
    const { id } = keyPressInfo;

    const portCurrentlyTalking = this.activeHandlers.onIsPortTalkingToPartyline(
      portNum,
      id,
    );
    if (!portCurrentlyTalking) {
      this.logger.warn(errMessage + ": port is not talking to partyline");
      return;
    } else if (tail.type === "LONG") {
      this.logger.warn(
        errMessage + ": a longTail is active for this port and partyline",
      );
      return;
    }

    const onlyKey = this.activeHandlers.onIsSoleActiveTalkKeyForPort(
      portNum,
      id,
    );
    //If this is the only talk key that's currently active for this port, we add a long tail:
    if (onlyKey) {
      this.addLongTail(portNum, id, portTails);
      this.activeHandlers.onUpdateAudioInfo(portNum);
      return;
    }
    //Otherwise we add a short tail:
    this.addShortTail(portNum, id, portTails);
    this.activeHandlers.onUpdateAudioInfo(portNum);
  }

  //If a tail is passed in, the tail will be removed, but the key will NOT be removed for that tail:
  private removeAllLongTailsForPort(
    portTails: TailInfo[],
    exemptKeyTurnOffForTail?: LongTailInfo,
  ): void {
    portTails.forEach((portTail) => {
      if (portTail.type === "LONG") {
        if (portTail === exemptKeyTurnOffForTail) {
          this.removeLongTail(portTail, portTails, false);
          return;
        }
        this.removeLongTail(portTail, portTails);
      }
    });
  }

  private removeLongTail(
    longTail: LongTailInfo,
    portTails: TailInfo[],
    turnOffKey: boolean = true,
  ) {
    const { portNum, plNum, startTimestamp } = longTail;
    if (turnOffKey) {
      //If less time has elapsed than the duration of a short tail, then add a short tail for the remaining duration
      //This ensures that a long tail never ends up being shorter than a regular short tail in practice:
      const timeElapsed = performance.now() - startTimestamp;

      if (timeElapsed < SHORT_TAIL_TIME_MS) {
        portTails[longTail.plNum] = { type: "NONE" };
        this.addShortTail(
          portNum,
          plNum,
          portTails,
          Math.max(0, SHORT_TAIL_TIME_MS - timeElapsed),
        );
        return;
      }
      //Otherwise, turn off the talk key
      this.activeHandlers.onKeyPress(portNum, {
        type: "TALK",
        id: plNum,
        setState: "OFF",
      });
    }
    portTails[longTail.plNum] = { type: "NONE" };
  }

  private removeShortTail(
    shortTail: ShortTailInfo,
    portTails: TailInfo[],
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
    portTails[plNum] = { type: "NONE" };
  }

  get status(): ManagerStatus {
    return this._status;
  }

  private addLongTail(
    portNum: number,
    plNum: number,
    portTails: TailInfo[],
  ): void {
    const errMessage = `Unable to add long tail for portNum ${portNum} and plNum ${plNum}`;

    if (!this.isPortNumAndPlNumValid(portNum, plNum, errMessage)) {
      return;
    }

    const tail = portTails[plNum];
    if (!tail) {
      this.logger.error(
        `addLongTail: Invariant violation: tail does not exist. Will do nothing`,
      );
      return;
    }

    if (tail.type !== "NONE") {
      this.logger.error(
        `addLongTail: Tail already exists (type ${tail.type}). Will do nothing`,
      );
      return;
    }

    portTails[plNum] = {
      type: "LONG",
      portNum,
      plNum,
      startTimestamp: performance.now(),
    };
  }

  private addShortTail(
    portNum: number,
    plNum: number,
    portTails: TailInfo[],
    timeMs: number = SHORT_TAIL_TIME_MS,
  ): void {
    const errMessage = `Unable to add short tail for portNum ${portNum} and plNum ${plNum}`;

    if (!this.isPortNumAndPlNumValid(portNum, plNum, errMessage)) {
      return;
    }

    const tail = portTails[plNum];
    if (!tail) {
      this.logger.error(
        errMessage +
          `: addShortTail: Invariant violation: unable to find tail slot`,
      );
      return;
    }
    if (tail.type !== "NONE") {
      this.logger.error(
        errMessage +
          `: addShortTail: There already is a tail for the port and PL. Will do nothing`,
      );
      return;
    }
    const timeoutId = setTimeout(
      () => this.handleShortTailEnd(portNum, plNum, portTails),
      timeMs,
    );

    portTails[plNum] = {
      type: "SHORT",
      portNum,
      plNum,
      startTimestamp: performance.now(),
      timeoutId,
    };
  }

  private handleShortTailEnd(
    portNum: number,
    plNum: number,
    portTails: TailInfo[],
  ): void {
    const tail = portTails[plNum];

    if (!tail) {
      this.logger.error(
        `handleShortTailEnd: Invariant violation: No tail exists for portNum ${portNum} and plNum ${plNum}. Will do nothing`,
      );
      return;
    }
    if (tail.type !== "SHORT") {
      this.logger.error(
        `handleShortTailEnd: Invariant violation: Tail type is ${tail.type} for portNum ${portNum} and plNum ${plNum}. Will do nothing`,
      );
      return;
    }

    const plsWithTails: Set<number> = new Set();
    portTails.forEach((tail) => {
      if (tail.type === "LONG" || tail.type === "SHORT") {
        plsWithTails.add(tail.plNum);
      }
    });

    //If there are no talk keys active for this port OTHER than any talk keys with a tail, this becomes true:
    const anyOtherTalkKeysActive =
      this.activeHandlers.onAreAnyOtherTalkKeysActiveForPort(
        portNum,
        plsWithTails,
      );

    portTails[plNum] = { type: "NONE" };
    //If the only talk keys that are active for this port are the ones that have long or short tails, then add a longTail:
    if (!anyOtherTalkKeysActive) {
      this.addLongTail(portNum, plNum, portTails);
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

  private createTails(): void {
    this.tails = Array.from({ length: this.numPorts }, () => {
      return Array.from({ length: this.config.numPartylines }, () => {
        return {
          type: "NONE",
        };
      });
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

  private clearShortTailTimeouts(): void {
    this.tails.forEach((portTail) => {
      portTail.forEach((tail) => {
        if (tail.type === "SHORT") {
          clearTimeout(tail.timeoutId);
        }
      });
    });
  }

  private resetRuntimeFields(): void {
    this.config = { ...BLANK_TAIL_CONFIG };
    this.numPorts = 0;
    this.createTails();
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
