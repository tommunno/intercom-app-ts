import type { ManagerStatus, TailState } from "../../../shared/types/index.js";
import {
  DEFAULT_NUM_PARTYLINES,
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
} from "../../constants/serverConstants.js";
import type {
  ITailManager,
  ILogger,
  TailHandlers,
  AudioMatrixConfig,
  TailConfig,
} from "../../contracts/index.js";
import { type KeyPressInfo } from "../../types/index.js";

export class TailManager implements ITailManager {
  private status: ManagerStatus = "IDLE";
  private handlers: TailHandlers | null = null;
  private context: string = "TailManager";

  private config: TailConfig = {
    numUsers: 0,
    numSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
    numPartylines: DEFAULT_NUM_PARTYLINES,
  };

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: this.context });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the ${this.context} whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  populate(config: TailConfig): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the ${this.context} whilst its status is ${this.status}`,
      );
    }
    this.config = { ...this.config };
    this.status = "POPULATED";
  }

  start(): void {
    if (this.status !== "POPULATED") {
      throw new Error(
        `Cannot start the ${this.context} whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.status = "RUNNING";
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
    if (this.status !== "RUNNING") {
      this.logger.warn(
        `Cannot stop the ${this.context} whilst its status is ${this.status}`,
      );
      return;
    }
    this.status = "IDLE";
  }

  //Still need to implement
  getTailState(userId: number, plId: number): TailState {
    if (this.checkAndWarnIfNotRunning("get tail state")) {
      return "NONE";
    }
    //Real logic to go here:
    return "NONE";
  }

  //Still need to implement. For now it's just passing data through
  //This provides the virtualized layer in front of the audio matrix, where we can control tails etc
  processKeyPress(userId: number, keyPressInfo: KeyPressInfo): void {
    if (this.checkAndWarnIfNotRunning("process key press")) {
      return;
    }
    this.activeHandlers.onKeyPress(userId, keyPressInfo);
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
