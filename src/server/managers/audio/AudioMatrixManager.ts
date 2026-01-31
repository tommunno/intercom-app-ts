import type { Key } from "node:readline";
import type {
  ManagerStatus,
  PartylineInfo,
} from "../../../shared/types/index.js";
import type {
  IAudioMatrixManager,
  ILogger,
  IOutputPort,
  IPartyline,
  IWebRtcMediaBridge,
} from "../../contracts/index.js";
import { OutputPort, Partyline } from "../../entities/index.js";
import {
  audioConfigIsValid,
  type AudioConfig,
  type KeyPressInfo,
} from "../../types/index.js";

export class AudioMatrixManager implements IAudioMatrixManager {
  private status: ManagerStatus = "IDLE";
  private context: string = "AudioMatrixManager";
  private config: AudioConfig = {
    numUsers: 0,
    numSoundcardChannels: 0,
    numPartylines: 0,
  };
  private numPorts: number = 0;
  private partylines: IPartyline[] = [];
  private outputPorts: IOutputPort[] = [];

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
    this.numPorts = config.numUsers + config.numSoundcardChannels;

    this.createPartylines();
    this.createOutputPorts();

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

  getPartylineInfos(userId: number): PartylineInfo[] | null {
    if (this.checkAndWarnIfNotRunning("get partyline infos")) {
      return null;
    }

    if (
      !Number.isSafeInteger(userId) ||
      userId >= this.config.numUsers ||
      userId < 0
    ) {
      this.logger.error(`userId ${userId} invalid. Cannot get partyline infos`);
      return null;
    }
    return this.partylines.map((pl) => {
      const state = pl.state;
      return {
        id: state.id,
        name: state.name,
        talk: pl.isUserTalking(userId) ? "ON" : "OFF",
        listen: pl.isUserListening(userId) ? "ON" : "OFF",
      };
    });
  }

  processKeyPress(keyPressInfo: KeyPressInfo, userId: number): void {
    if (this.checkAndWarnIfNotRunning("process key request")) {
      return;
    }

    this.logger.info(`Processing key press...`);
    const { type, id: partylineId, setState } = keyPressInfo;
    const state = setState === "ON" ? true : false;

    const partyline = this.partylines.find((pl) => pl.id === partylineId);
    if (!partyline) {
      this.logger.warn(
        `No partyline exists with ID ${partylineId}, so cannot process ${type.toLowerCase()} key request`,
      );
      return;
    }
    //TALK:
    if (type === "TALK") {
      if (this.handleTalkKeyRequest(partyline, userId, state) === false) {
        return;
      }
    }
    //LISTEN:
    else {
      if (this.handleListenKeyRequest(partyline, userId, state) === false) {
        return;
      }
    }

    this.logger.info(`Partyline portsTalking:`, partyline.state.portsTalking);
    this.logger.info(
      `Partyline portsListening:`,
      partyline.state.portsListening,
    );
  }

  //Returns true if successful
  private handleTalkKeyRequest(
    partyline: IPartyline,
    userId: number,
    state: boolean,
  ): boolean {
    const { success, message } = partyline.setUserTalking(userId, state);
    if (!success) {
      this.logger.warn(
        `Unable to set user ${userId} talk state on partyline ${partyline.id}, because ${message}`,
      );
      return false;
    }
    return true;
  }

  //Returns true if successful
  private handleListenKeyRequest(
    partyline: IPartyline,
    userId: number,
    state: boolean,
  ): boolean {
    const { success, message } = partyline.setUserListening(userId, state);
    if (!success) {
      this.logger.warn(
        `Unable to set user ${userId} listen state on partyline ${partyline.id}, because ${message}`,
      );
      return false;
    }
    return true;
  }

  private createPartylines(): void {
    this.partylines = [];
    for (let i = 0; i < this.config.numPartylines; i++) {
      this.partylines.push(
        new Partyline(
          {
            id: i,
            name: `${i + 1}`,
            numUsers: this.config.numUsers,
            numSoundcardChannels: this.config.numSoundcardChannels,
            portsTalking: new Set(),
            portsListening: new Set(),
          },
          this.logger,
        ),
      );
    }
  }

  //Still to implement
  private createOutputPorts(): void {
    // this.outputPorts = [];
    // for (let i = 0; i < this.numPorts; i++) {
    //   this.partylines.push(new OutputPort());
    // }
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
