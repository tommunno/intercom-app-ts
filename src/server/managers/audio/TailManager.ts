import type { ManagerStatus, TailState } from "../../../shared/types/index.js";
import type { ITailManager, ILogger } from "../../contracts/index.js";
import { audioConfigIsValid, type AudioConfig } from "../../types/index.js";

export class TailManager implements ITailManager {
  private status: ManagerStatus = "IDLE";
  private context: string = "TailManager";
  private config: AudioConfig = {
    numUsers: 0,
    numSoundcardChannels: 0,
    numPartylines: 0,
  };

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: this.context });
  }

  init(config: AudioConfig): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the ${this.context} whilst its status is ${this.status}`,
      );
    }

    audioConfigIsValid({
      config,
      throwErr: true,
      context: this.context,
    });

    this.config.numUsers = config.numUsers;
    this.config.numSoundcardChannels = config.numSoundcardChannels;
    this.config.numPartylines = config.numPartylines;

    this.status = "INITIALIZED";
  }

  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the ${this.context} whilst its status is ${this.status}`,
      );
    }
    this.status = "RUNNING";
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
