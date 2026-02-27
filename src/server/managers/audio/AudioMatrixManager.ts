import type {
  KeyPressInfo,
  ManagerStatus,
  PartylineInfo,
} from "../../../shared/types/index.js";
import type {
  AudioMatrixConfig,
  AudioMatrixHandlers,
  AudioMatrixPopulateConfig,
  AudioMatrixSnapshot,
  AudioMatrixStopResult,
  IAudioMatrixManager,
  ILogger,
  IOutputPort,
  IPartyline,
  PartylineSnapshot,
} from "../../contracts/index.js";
import { OutputPort, Partyline } from "../../entities/index.js";
import { type CrosspointChange } from "../../types/index.js";
import { dataIsType } from "../../../shared/helpers.js";
import {
  DEFAULT_NUM_PARTYLINES,
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
  DEFAULT_NUM_USERS,
  ENABLE_DEV_MATRIX_VIEW,
  MAX_NUM_PARTYLINES,
} from "../../constants/serverConstants.js";
import { devLogCrosspoints } from "../../serverHelpers.js";

const BLANK_AUDIO_MATRIX_CONFIG: AudioMatrixConfig = {
  numUsers: DEFAULT_NUM_USERS,
  numSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
  numPartylines: DEFAULT_NUM_PARTYLINES,
};

export class AudioMatrixManager implements IAudioMatrixManager {
  private _status: ManagerStatus = "IDLE";
  private handlers: AudioMatrixHandlers | null = null;
  private context: string = "AudioMatrixManager";
  private config: AudioMatrixConfig = {
    ...BLANK_AUDIO_MATRIX_CONFIG,
  };
  private numPorts: number = 0;
  private partylines: IPartyline[] = [];
  private outputPorts: IOutputPort[] = [];

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

  populate(
    config: AudioMatrixPopulateConfig,
    snapshot: AudioMatrixSnapshot | null,
  ): AudioMatrixConfig {
    if (this._status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the AudioMatrixManager whilst its status is ${this._status}`,
      );
    }

    this.setConfig(config);

    if (snapshot) {
      this.createPartylines(snapshot.partylineSnapshots);
      this.createOutputPorts();
    } else {
      this.createPartylines();
      this.createOutputPorts();
    }

    this._status = "POPULATED";
    return { ...this.config };
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
    this.updateOutputCrosspoints();
  }

  //Return no snapshot if AudioMatrix is already stopped
  stop(): AudioMatrixStopResult {
    const config = { ...this.config };

    if (this._status === "IDLE" || this._status === "INITIALIZED") {
      return { config, snapshot: null };
    }
    const snapshot = this.getSnapshot();

    this.resetRuntimeFields();
    this._status = "INITIALIZED";
    return { config, snapshot };
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
    this.logCrosspoints();
  }

  //Is the specified port only talking to the specified partyline and no other partylines:
  isSoleActiveTalkKeyForPort(portNum: number, plNum: number): boolean {
    if (!this.isPortNumValid(portNum)) {
      this.logger.error(
        `isSoleActiveTalkKeyForPort: portNum ${portNum} is invalid. Will return false`,
      );
      return false;
    }
    const specifiedPl = this.partylines[plNum];
    if (!specifiedPl) {
      this.logger.error(
        `isSoleActiveTalkKeyForPort: No partyline found for plNum ${plNum}. Will return false`,
      );
      return false;
    }
    if (!specifiedPl.isPortTalking(portNum)) {
      this.logger.error(
        `isSoleActiveTalkKeyForPort: The specified PL (plNum ${plNum}) does not have port ${portNum} talking to it. Will return false`,
      );
      return false;
    }
    const anyOtherTalkKeys = this.partylines.some(
      (pl) => pl !== specifiedPl && pl.isPortTalking(portNum),
    );
    return !anyOtherTalkKeys;
  }

  isPortTalkingToPartyline(portNum: number, plNum: number): boolean {
    if (!this.isPortNumValid(portNum)) {
      this.logger.error(
        `isPortTalkingToPartyline: portNum ${portNum} is invalid. Will return false`,
      );
      return false;
    }
    const pl = this.partylines[plNum];
    if (!pl) {
      this.logger.error(
        `isPortTalkingToPartyline:  No partyline found for plNum ${plNum}. Will return false`,
      );
      return false;
    }
    return pl.isPortTalking(portNum);
  }

  get status(): ManagerStatus {
    return this._status;
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

  private createPartylines(snapshots?: PartylineSnapshot[]): void {
    this.partylines = [];

    for (let i = 0; i < this.config.numPartylines; i++) {
      //In the case of a snapshot being used, we only restore the listens and the SOUNDCARD talks. This is a design choice.
      //Ie, on a restart of the matrix, all USER talk keys are turned off (prevents sticky talk keys from a momentary key press or a tail from the TailManager).
      const snap = snapshots?.[i];
      let portsL: Set<number> | null = null;
      let soundcardPortsT: Set<number> | null = null;
      if (snap) {
        portsL = new Set();
        for (const num of snap.portsListening) {
          if (this.isPortNumValid(num)) {
            portsL.add(num);
          }
        }
        soundcardPortsT = new Set();
        for (const num of snap.portsTalking) {
          if (this.isPortNumSoundcard(num)) {
            soundcardPortsT.add(num);
          }
        }
      }

      //We want to ensure soundcard channel 1 talks and listens to partyline 1, 2 to 2 etc
      //This variable gives the portNum that would need to talk and listen to the partyline to achieve this
      const soundcardPortNum = i + this.config.numUsers;
      //soundcardPortNum can go over the number of available ports
      //So we clamp it here. If it's above, it becomes null
      const clampedSoundcardPortNum =
        soundcardPortNum >= this.numPorts ? null : soundcardPortNum;

      this.partylines.push(
        new Partyline(
          {
            id: i,
            name: snap?.name ?? `${i + 1}`,
            numPorts: this.numPorts,
            portsTalking:
              //Use the soundcard filtered portsTalking snapshot if it exists:
              soundcardPortsT ??
              new Set(
                //Otherwise add in the soundcard port num if it exists:
                clampedSoundcardPortNum !== null
                  ? [clampedSoundcardPortNum]
                  : [],
              ),
            portsListening:
              //Use the portsListening snapshot if it exists:
              portsL ??
              //Otherwise add in the soundcard port num if it exists:
              new Set(
                clampedSoundcardPortNum !== null
                  ? [clampedSoundcardPortNum]
                  : [],
              ),
          },
          this.logger,
        ),
      );
    }
  }

  private createOutputPorts(): void {
    this.outputPorts = [];

    for (let i = 0; i < this.numPorts; i++) {
      const plListens: Set<number> = new Set();
      this.partylines.forEach((pl) => {
        if (pl.portsListening.has(i)) {
          plListens.add(pl.id);
        }
      });

      this.outputPorts.push(
        new OutputPort(
          {
            id: i,
            type: i < this.config.numUsers ? "WEB_RTC" : "SOUNDCARD",
            pointToPointListens: new Set(),
            plListens,
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

  private updateOutputCrosspoints(): void {
    this.outputPorts.forEach((port) => {
      this.processCrosspointChanges(port.update());
    });
    this.logCrosspoints();
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

  private isPortNumSoundcard(portNum: number): boolean {
    return (
      Number.isSafeInteger(portNum) &&
      portNum >= this.config.numUsers &&
      portNum < this.numPorts
    );
  }

  private getSnapshot(): AudioMatrixSnapshot {
    const partylineSnapshots: PartylineSnapshot[] = [];
    this.partylines.forEach((pl) => partylineSnapshots.push(pl.getSnapshot()));
    return { partylineSnapshots };
  }

  private resetRuntimeFields(): void {
    this.config = { ...BLANK_AUDIO_MATRIX_CONFIG };
    this.numPorts = 0;
    this.partylines = [];
    this.outputPorts = [];
  }

  //If ENABLE_DEV_MATRIX_VIEW is set true in serverConstants, you can run tail -f dev_matrix_view.txt in terminal to see a live updating view of crosspoints
  private logCrosspoints(): void {
    if (!ENABLE_DEV_MATRIX_VIEW) return;
    devLogCrosspoints(this.partylines, this.outputPorts, this.logger);
  }

  private get activeHandlers(): AudioMatrixHandlers {
    if (!this.handlers)
      throw new Error("AudioMatrixManager handlers not initialized!");
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
