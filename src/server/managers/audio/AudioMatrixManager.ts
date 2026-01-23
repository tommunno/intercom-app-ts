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
import { audioConfigIsValid, type AudioConfig } from "../../types/index.js";

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

  constructor(
    private webRTCMediaBridge: IWebRtcMediaBridge,
    private logger: ILogger,
  ) {
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
      !Number.isInteger(userId) ||
      userId >= this.config.numUsers ||
      userId < 0
    ) {
      this.logger.error(`userId ${userId} invalid. Cannot get partyline infos`);
      return null;
    }
    return this.partylines.map((pl) => {
      const state = pl.getState();
      return {
        id: state.id,
        name: state.name,
        talk: pl.isPortTalking(userId),
        listen: pl.isPortListening(userId),
      };
    });
  }

  private createPartylines(): void {
    this.partylines = [];
    for (let i = 0; i < this.config.numPartylines; i++) {
      this.partylines.push(
        new Partyline({
          id: i,
          name: `${i + 1}`,
          portsTalking: new Set(),
          portsListening: new Set(),
        }),
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
