import type {
  ManagerStatus,
  PartylineInfo,
} from "../../../shared/types/index.js";
import type {
  AudioMatrixConfig,
  AudioMatrixHandlers,
  AudioMatrixPopulateConfig,
  IAudioMatrixManager,
  ILogger,
  IOutputPort,
  IPartyline,
} from "../../contracts/index.js";
import { OutputPort, Partyline } from "../../entities/index.js";
import { type CrosspointChange, type KeyPressInfo } from "../../types/index.js";
import { dataIsType } from "../../../shared/helpers.js";
import {
  DEFAULT_NUM_PARTYLINES,
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
  DEFAULT_NUM_USERS,
  MAX_NUM_PARTYLINES,
} from "../../constants/serverConstants.js";

export class AudioMatrixManager implements IAudioMatrixManager {
  private status: ManagerStatus = "IDLE";
  private handlers: AudioMatrixHandlers | null = null;
  private context: string = "AudioMatrixManager";
  private config: AudioMatrixConfig = {
    numUsers: DEFAULT_NUM_USERS,
    numSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
    numPartylines: DEFAULT_NUM_PARTYLINES,
  };
  private numPorts: number = 0;
  private partylines: IPartyline[] = [];
  private outputPorts: IOutputPort[] = [];

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

  populate(config: AudioMatrixPopulateConfig): AudioMatrixConfig {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the AudioMatrixManager whilst its status is ${this.status}`,
      );
    }

    this.setConfig(config);
    this.createPartylines();
    this.createOutputPorts();

    this.status = "POPULATED";
    return { ...this.config };
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
    this.setSoundcardPartylines();
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

  setHandlers(handlers: AudioMatrixHandlers): void {
    this.handlers = handlers;
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
        talk: pl.isPortTalking(userId) ? "ON" : "OFF",
        listen: pl.isPortListening(userId) ? "ON" : "OFF",
      };
    });
  }

  processKeyPress(portNum: number, keyPressInfo: KeyPressInfo): void {
    if (this.checkAndWarnIfNotRunning("process key press")) {
      return;
    }
    if (!this.isPortNumValid(portNum)) {
      this.logger.warn(
        `portNum ${portNum} is invalid. Will not process key press`,
      );
      return;
    }

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
      this.handleTalkKeyRequest(partyline, portNum, state);
    }
    //LISTEN:
    else {
      this.handleListenKeyRequest(partyline, portNum, state);
    }
  }

  private setConfig(config: AudioMatrixPopulateConfig): void {
    const {
      numUsers: nU,
      numSoundcardChannels: nSC,
      numPartylines: nP,
    } = config;

    //We trust both numUsers and numSoundcardChannels here. These have been validated by the AccountManager and the AudioEngineManager respectively
    this.config.numUsers = nU;
    this.config.numSoundcardChannels = nSC;

    if (
      !dataIsType("safeIntegerNum", nP) ||
      nP < 1 ||
      nP > MAX_NUM_PARTYLINES
    ) {
      this.logger.error(
        `numPartylines is invalid. Will fall back to the default value of ${DEFAULT_NUM_PARTYLINES}`,
      );
    } else {
      this.config.numPartylines = nP;
    }
    this.numPorts = this.config.numUsers + this.config.numSoundcardChannels;
  }

  //Returns true if successful
  private handleTalkKeyRequest(
    partyline: IPartyline,
    portNum: number,
    state: boolean,
  ): boolean {
    const { success, message } = partyline.setPortTalking(portNum, state);
    if (!success) {
      this.logger.warn(
        `Unable to set port ${portNum} talk state on partyline ${partyline.id}, because ${message}`,
      );
      return success;
    }

    //Only process crosspoint changes for ports that are listening to the partyline:
    partyline.portsListening.forEach((listeningPortNum) => {
      const port = this.outputPorts[listeningPortNum];
      if (!port) {
        this.logger.error(
          `Invariant violation: No port found for listeningPortNum ${listeningPortNum} in handleTalkKeyRequest`,
        );
        return;
      }
      //If talk key is being turned on:
      if (state) {
        this.processCrosspointChanges(
          port.updateForPlTalkAdd(partyline.id, portNum),
        );
        return;
      }
      //If talk key is being turned off:
      this.processCrosspointChanges(
        port.updateForPlTalkRemove(partyline.id, portNum),
      );
    });
    return success;
  }

  //Returns true if successful
  private handleListenKeyRequest(
    partyline: IPartyline,
    portNum: number,
    state: boolean,
  ): boolean {
    const { success, message } = partyline.setPortListening(portNum, state);
    if (!success) {
      this.logger.warn(
        `Unable to set port ${portNum} listen state on partyline ${partyline.id}, because ${message}`,
      );
      return success;
    }
    const port = this.outputPorts[portNum];
    if (!port) {
      this.logger.error(
        `Invariant violation: No port found for portNum ${portNum} in handleListenKeyRequest`,
      );
      return success;
    }

    //Only process crosspoint changes for the one port that's listening to the partyline:
    //If listen key is being turned on:
    if (state) {
      this.processCrosspointChanges(port.updateForPlListenAdd(partyline.id));
      return success;
    }
    //If listen key is being turned off:
    this.processCrosspointChanges(port.updateForPlListenRemove(partyline.id));
    return success;
  }

  private createPartylines(): void {
    this.partylines = [];
    for (let i = 0; i < this.config.numPartylines; i++) {
      this.partylines.push(
        new Partyline(
          {
            id: i,
            name: `${i + 1}`,
            numPorts: this.numPorts,
            portsTalking: new Set(),
            portsListening: new Set(),
          },
          this.logger,
        ),
      );
    }
  }

  private createOutputPorts(): void {
    this.outputPorts = [];
    for (let i = 0; i < this.numPorts; i++) {
      this.outputPorts.push(
        new OutputPort(
          {
            id: i,
            type: i < this.config.numUsers ? "WEB_RTC" : "SOUNDCARD",
            pointToPointListens: new Set(),
            plListens: new Set(),
          },
          this.getPlTalks.bind(this),
          this.logger,
        ),
      );
    }
  }

  private getPlTalks(plNum: number): ReadonlySet<number> | null {
    const pl = this.partylines[plNum];
    if (!pl) {
      this.logger.error(`getPlTalks: unable to find pl for plNum ${plNum}`);
      return null;
    }
    return pl.portsTalking;
  }

  private setSoundcardPartylines(): void {
    for (let i = 0; i < this.config.numSoundcardChannels; i++) {
      if (i >= this.config.numPartylines) break;
      this.processKeyPress(i + this.config.numUsers, {
        type: "TALK",
        id: i,
        setState: "ON",
      });
      this.processKeyPress(i + this.config.numUsers, {
        type: "LISTEN",
        id: i,
        setState: "ON",
      });
    }
  }

  private processCrosspointChanges(changes: CrosspointChange[]) {
    changes.forEach((change) => {
      this.activeHandlers.onCrosspointChange(change);
    });
  }

  private isPortNumValid(portNum: number): boolean {
    return (
      Number.isSafeInteger(portNum) && portNum >= 0 && portNum < this.numPorts
    );
  }

  private get activeHandlers(): AudioMatrixHandlers {
    if (!this.handlers)
      throw new Error("AudioMatrixManager handlers not initialized!");
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
