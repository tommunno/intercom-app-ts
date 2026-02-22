import type { ManagerStatus, TailState } from "../../../shared/types/index.js";
import {
  DEFAULT_NUM_PARTYLINES,
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
} from "../../constants/serverConstants.js";
import type {
  ITailManager,
  ILogger,
  TailHandlers,
  TailConfig,
} from "../../contracts/index.js";
import { type KeyPressInfo } from "../../types/index.js";

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

  private get activeHandlers(): TailHandlers {
    if (!this.handlers)
      throw new Error(`${this.context} handlers not initialized!`);
    return this.handlers;
  }

  stop(): void {
    if (this._status === "IDLE" || this._status === "INITIALIZED") {
      return;
    }
    this._status = "INITIALIZED";
    this.resetRuntimeFields();
  }

  //Still need to implement
  getTailState(userId: number, plId: number): TailState {
    if (this.checkAndWarnIfNotRunning("get tail state")) {
      return "NONE";
    }
    //Real logic to go here:
    return "NONE";
  }

  get status(): ManagerStatus {
    return this._status;
  }

  //Still need to implement. For now it's just passing data through
  //This provides the virtualized layer in front of the audio matrix, where we can control tails etc
  processKeyPress(userId: number, keyPressInfo: KeyPressInfo): void {
    if (this.checkAndWarnIfNotRunning("process key press")) {
      return;
    }
    this.activeHandlers.onKeyPress(userId, keyPressInfo);
  }

  private resetRuntimeFields(): void {
    this.config = { ...BLANK_TAIL_CONFIG };
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
