import type {
  AdminAudioConfigInfo,
  AdminPartylinesChangeRequest,
  AdminPartylinesInfo,
  AdminUsersChangeRequest,
  KeyPressInfo,
  ManagerStatus,
  PartylineInfo,
} from "../../../shared/types/index.js";
import type {
  AudioAdminPartylinesChangeRequestResult,
  AudioAdminUsersChangeRequestResult,
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
import {
  type AllowedPlsInfo,
  type AllowedPlsSetInfo,
  type CrosspointChange,
  type DisallowedPlsInfo,
} from "../../types/index.js";
import { dataIsType, formatList } from "../../../shared/helpers.js";
import { ENABLE_DEV_MATRIX_VIEW } from "../../constants/serverConstants.js";
import {
  DEFAULT_NUM_PARTYLINES,
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
  DEFAULT_NUM_USERS,
  MAX_NUM_PARTYLINES,
  MAX_PARTYLINE_NAME_LENGTH,
} from "../../../shared/constants/sharedConstants.js";
import { devLogCrosspoints, getRemovedSetItems } from "../../serverHelpers.js";

const BLANK_AUDIO_MATRIX_CONFIG: AudioMatrixConfig = {
  numUsers: DEFAULT_NUM_USERS,
  numSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
  numPartylines: DEFAULT_NUM_PARTYLINES,
  allowedPlsInfos: Array.from({ length: DEFAULT_NUM_USERS }, (_, userId) => ({
    userId,
    //The blank config gives the user access to the first partyline (we don't know how many partylines there are yet, but we can guarantee that 0 exists)
    allowedPls: new Set([0]),
  })),
};

export class AudioMatrixManager implements IAudioMatrixManager {
  private _status: ManagerStatus = "IDLE";
  private handlers: AudioMatrixHandlers | null = null;
  private context: string = "AudioMatrixManager";
  private _config: AudioMatrixConfig = {
    ...BLANK_AUDIO_MATRIX_CONFIG,
    allowedPlsInfos: this.copyAllowedPlsInfos(
      BLANK_AUDIO_MATRIX_CONFIG.allowedPlsInfos,
    ),
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
    return this.config;
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
    const config = this.config;

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
      userId >= this._config.numUsers ||
      userId < 0
    ) {
      this.logger.error(`userId ${userId} invalid. Cannot get partyline infos`);
      return null;
    }
    const aPlsInfo = this._config.allowedPlsInfos[userId];
    if (!aPlsInfo) {
      this.logger.error(
        `Invariant violation: unable to get allowed PLs info for userId ${userId}. Cannot get partyline infos`,
      );
      return null;
    }
    return this.partylines.map((pl) => {
      const state = pl.state;
      return {
        id: state.id,
        name: state.name,
        talk: pl.isPortTalking(userId) ? "ON" : "OFF",
        listen: pl.isPortListening(userId) ? "ON" : "OFF",
        allowed: aPlsInfo.allowedPls.has(state.id),
      };
    });
  }

  getAllowedPlsInfos(): AllowedPlsInfo[] {
    if (this.checkAndWarnIfNotRunning("get allowed PLs infos")) {
      return [];
    }
    const aPlsInfos: AllowedPlsInfo[] = [];
    this._config.allowedPlsInfos.forEach((aPlsInfo) => {
      const { userId, allowedPls } = aPlsInfo;
      aPlsInfos.push({ userId, allowedPls: Array.from(allowedPls) });
    });
    return aPlsInfos;
  }

  isPlAllowedForPortNum(portNum: number, plNum: number): boolean {
    if (this.checkAndWarnIfNotRunning("check if PL is allowed for User ID")) {
      return false;
    }
    const isValid = this.isPortNumValid(portNum);
    if (!isValid) {
      this.logger.error(
        `isPlAllowedForPortNum: Invalid portNum. Will return false`,
      );
      return false;
    }
    //In this case, the portNum is a soundcard channel, not a user, so has full access:
    if (portNum >= this._config.numUsers) {
      return true;
    }
    const aPlsInfo = this._config.allowedPlsInfos[portNum];
    if (!aPlsInfo) {
      this.logger.error(
        `isPlAllowedForUserId: Invariant violation: aPlsInfo not found`,
      );
      return false;
    }
    return aPlsInfo.allowedPls.has(plNum);
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

    if (!this.isPlAllowedForPortNum(portNum, partylineId)) {
      this.logger.error(
        `processKeyPress: portNum ${portNum} is not allowed access to partyline ID ${partyline.id}`,
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
    if (
      this.checkAndWarnIfNotRunning("check if sole active talk key for port")
    ) {
      return false;
    }
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
    if (
      this.checkAndWarnIfNotRunning("check if port is talking to partyline")
    ) {
      return false;
    }
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

  //Is the specified port talking to any partylines OTHER than the ones passed in:
  areAnyOtherTalkKeysActiveForPort(
    portNum: number,
    plNums: ReadonlySet<number>,
  ): boolean {
    if (
      this.checkAndWarnIfNotRunning(
        "check if any other talk keys are active for port",
      )
    ) {
      return false;
    }
    let anyOtherTalkKeys = false;
    const filteredPls = this.partylines.filter((pl) => !plNums.has(pl.id));
    for (const pl of filteredPls) {
      if (pl.isPortTalking(portNum)) {
        anyOtherTalkKeys = true;
        break;
      }
    }
    return anyOtherTalkKeys;
  }

  getAdminPartylinesInfo(): AdminPartylinesInfo {
    if (this.checkAndWarnIfNotRunning("get admin partylines info")) {
      return [];
    }
    const plsInfo: AdminPartylinesInfo = [];
    this.partylines.forEach((pl) => {
      plsInfo.push({ id: pl.id, name: pl.name });
    });
    return plsInfo;
  }

  getAdminAudioConfigInfo(): AdminAudioConfigInfo {
    if (this.checkAndWarnIfNotRunning("get admin audio config info")) {
      return { numUsers: 0, numPartylines: 0 };
    }
    return {
      numUsers: this._config.numPartylines,
      numPartylines: this._config.numPartylines,
    };
  }

  //For admins updating info about users
  //If users have been disallowed from interacting with certain PLs, disallowedPlsInfos are returned. The controller would need to act on these in order to turn off those keys if it wants to (eg through the TailManager)
  processAdminUsersChangeRequest(
    changeRequest: AdminUsersChangeRequest,
  ): AudioAdminUsersChangeRequestResult {
    const result = this.checkAndWarnIfNotRunning(
      "process admin users change request",
    );
    if (result)
      return {
        success: false,
        message: "Internal server error",
        userIdsToUpdate: [],
        disallowedPlsInfos: [],
      };

    let anyAplsNotFound = false;
    let anyDataNotValid = false;
    const userIdsToUpdate: number[] = [];
    const disallowedPlsInfos: DisallowedPlsInfo[] = [];

    for (const userChange of changeRequest) {
      const { userId: id, allowedPls: aPls } = userChange;
      if (!aPls) continue;

      const foundAPlsInfo = this._config.allowedPlsInfos[id];
      if (!foundAPlsInfo) {
        this.logger.warn(
          `Unable to update allowed PLs: allowedPlsInfo at ${id} does not exist`,
        );
        anyAplsNotFound = true;
        continue;
      }

      const resolvedAPls = this.resolveAllowedPls(aPls);

      if (resolvedAPls) {
        const oldAPls = foundAPlsInfo.allowedPls;
        foundAPlsInfo.allowedPls = resolvedAPls;
        userIdsToUpdate.push(id);
        disallowedPlsInfos.push({
          userId: id,
          disallowedPls: getRemovedSetItems(oldAPls, resolvedAPls),
        });
      } else {
        this.logger.warn(
          `Unable to update allowed PLs for userId ${id}. The data is invalid`,
        );
        anyDataNotValid = true;
      }
    }
    let message = "";
    if (anyAplsNotFound) {
      message += `Unable to find allowed PL records for one or more users`;
    }
    if (anyDataNotValid) {
      message += `${anyAplsNotFound ? "; i" : "I"}nvalid data`;
    }
    if (message) {
      return {
        success: false,
        message,
        userIdsToUpdate,
        disallowedPlsInfos,
      };
    }
    return {
      success: true,
      userIdsToUpdate,
      disallowedPlsInfos,
    };
  }

  processAdminPartylinesChangeRequest(
    changeRequest: AdminPartylinesChangeRequest,
  ): AudioAdminPartylinesChangeRequestResult {
    let anyPlNotFound = false;
    let anyPlNameNotValid = false;
    changeRequest.forEach((req) => {
      if (req.plName === null) {
        return;
      }
      const pl = this.partylines[req.plId];
      if (!pl) {
        anyPlNotFound = true;
        return;
      }
      const trimmedPlName = req.plName.trim();
      if (!this.isPlNameValid(req.plName)) {
        anyPlNameNotValid = true;
        return;
      }
      pl.name = trimmedPlName;
    });

    let message = "";
    if (anyPlNotFound) {
      message += "Unable to find partylines";
    }
    if (anyPlNameNotValid) {
      message += `${anyPlNotFound ? "; i" : "I"}nvalid data`;
    }
    if (message) {
      return {
        success: false,
        message,
      };
    }
    return {
      success: true,
    };
  }

  get status(): ManagerStatus {
    return this._status;
  }

  get config(): AudioMatrixConfig {
    return {
      ...this._config,
      allowedPlsInfos: this.copyAllowedPlsInfos(this._config.allowedPlsInfos),
    };
  }

  private setConfig(config: AudioMatrixPopulateConfig): void {
    const {
      numUsers: nU,
      numSoundcardChannels: nSC,
      numPartylines: nP,
      allowedPlsInfos: aPlsI,
    } = config;

    //We trust both numUsers and numSoundcardChannels here. These have been validated by the AccountManager and the AudioEngineManager respectively
    this._config.numUsers = nU;
    this._config.numSoundcardChannels = nSC;

    if (
      !dataIsType("safeIntegerNum", nP) ||
      nP < 1 ||
      nP > MAX_NUM_PARTYLINES
    ) {
      this.logger.error(
        `numPartylines is invalid. Will fall back to the default value of ${DEFAULT_NUM_PARTYLINES}`,
      );
    } else {
      this._config.numPartylines = nP;
    }

    this._config.allowedPlsInfos = this.createDefaultAllowedPlsInfos();
    if (aPlsI) {
      this._config.allowedPlsInfos = this.resolveAllowedPlsInfos(aPlsI);
    }

    this.numPorts = this._config.numUsers + this._config.numSoundcardChannels;
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

    for (let i = 0; i < this._config.numPartylines; i++) {
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
      const soundcardPortNum = i + this._config.numUsers;
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
            type: i < this._config.numUsers ? "WEB_RTC" : "SOUNDCARD",
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

  private resolveAllowedPlsInfos(infos: AllowedPlsInfo[]): AllowedPlsSetInfo[] {
    const infosToModify = this._config.allowedPlsInfos;
    const invalidUserIds: number[] = [];
    const invalidAPlsForUserIds: number[] = [];
    infos.forEach((newInfo) => {
      const infoToModify = infosToModify.find(
        (el) => el.userId === newInfo.userId,
      );
      if (!infoToModify) {
        invalidUserIds.push(newInfo.userId);
        return;
      }
      const resolvedAPls = this.resolveAllowedPls(newInfo.allowedPls);
      if (!resolvedAPls) {
        invalidAPlsForUserIds.push(newInfo.userId);
        return;
      }
      infoToModify.allowedPls = resolvedAPls;
    });
    if (invalidUserIds.length !== 0) {
      const plural = invalidUserIds.length > 1;
      this.logger.warn(
        `Invalid allowed PLs: unable to find user${plural ? "s" : ""} with ID${plural ? "s" : ""} ${formatList(invalidUserIds)}`,
      );
    }
    if (invalidAPlsForUserIds.length !== 0) {
      const plural = invalidAPlsForUserIds.length > 1;
      this.logger.warn(
        `Invalid allowed PLs: invalid PL number for user${plural ? "s" : ""} with ID${plural ? "s" : ""} ${formatList(invalidAPlsForUserIds)}`,
      );
    }
    return infosToModify;
  }

  private createDefaultAllowedPlsInfos(): AllowedPlsSetInfo[] {
    //By default, allow users access to all partylines:
    return Array.from({ length: this._config.numUsers }, (_, userId) => ({
      userId,
      allowedPls: new Set(
        Array.from({ length: this._config.numPartylines }, (_, plNum) => plNum),
      ),
    }));
  }

  //Returns null if unable to create set:
  private resolveAllowedPls(aPls: number[]): Set<number> | null {
    const newAPls = new Set<number>();
    for (const plNum of aPls) {
      if (plNum < 0 || plNum >= this._config.numPartylines) {
        return null;
      }
      newAPls.add(plNum);
    }
    return newAPls;
  }

  private copyAllowedPlsInfos(infos: AllowedPlsSetInfo[]): AllowedPlsSetInfo[] {
    const allowedPlsInfos: AllowedPlsSetInfo[] = [];
    infos.forEach((info) => {
      allowedPlsInfos.push({ ...info, allowedPls: new Set(info.allowedPls) });
    });
    return allowedPlsInfos;
  }

  private isPortNumValid(portNum: number): boolean {
    return (
      Number.isSafeInteger(portNum) && portNum >= 0 && portNum < this.numPorts
    );
  }

  private isPortNumSoundcard(portNum: number): boolean {
    return (
      Number.isSafeInteger(portNum) &&
      portNum >= this._config.numUsers &&
      portNum < this.numPorts
    );
  }

  private isPlNameValid(name: string): boolean {
    return name.length > 0 && name.length <= MAX_PARTYLINE_NAME_LENGTH;
  }

  private getSnapshot(): AudioMatrixSnapshot {
    const partylineSnapshots: PartylineSnapshot[] = [];
    this.partylines.forEach((pl) => partylineSnapshots.push(pl.getSnapshot()));
    return { partylineSnapshots };
  }

  private resetRuntimeFields(): void {
    //Spread this config out properly:
    this._config = {
      ...BLANK_AUDIO_MATRIX_CONFIG,
      allowedPlsInfos: this.copyAllowedPlsInfos(
        BLANK_AUDIO_MATRIX_CONFIG.allowedPlsInfos,
      ),
    };
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
