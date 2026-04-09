//Types:
import type {
  AdminPartylinesChangeRequest,
  AdminPartylinesInfo,
  AdminSoundcardsInfo,
  AdminUsersChangeRequest,
  AudioInfo,
  KeyPressInfo,
  MergedPartylineInfo,
} from "../../shared/types/index.js";
import type {
  AudioAdminInfos,
  AudioAdminPartylinesChangeRequestResult,
  AudioAdminUsersChangeRequestResult,
  AudioEngineConfig,
  AudioEnginePopulateConfig,
  AudioHandlers,
  AudioMatrixConfig,
  AudioMatrixPopulateConfig,
  AudioMatrixSnapshot,
  IAudioController,
  IAudioEngineManager,
  IAudioMatrixManager,
  ILogger,
  ITailManager,
  IWebRtcMediaBridge,
  PartylineSnapshot,
  TailSnapshot,
} from "../contracts/index.js";
import type {
  AllowedPlsInfo,
  AudioPopulateData,
  CrosspointChange,
  DisallowedPlsInfo,
  RtcMediaStreamTrack,
  TrackAndStream,
} from "../types/index.js";

export class AudioController implements IAudioController {
  private handlers: AudioHandlers | null = null;

  constructor(
    private audioEngineManager: IAudioEngineManager,
    private audioMatrixManager: IAudioMatrixManager,
    private tailManager: ITailManager,
    private webRtcMediaBridge: IWebRtcMediaBridge,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "AudioController" });
  }

  init(): void {
    this.bindListeners();
    this.audioEngineManager.init();
    this.audioMatrixManager.init();
    this.tailManager.init();
    this.webRtcMediaBridge.init();
  }

  populate(data: AudioPopulateData): void {
    this.populateManagers(data, null);
  }

  private buildAudioEnginePopulateConfig(
    data: AudioPopulateData,
  ): AudioEnginePopulateConfig {
    const {
      numUsers,
      requestedNumSoundcardChannels: rNumSC,
      requestedSoundcardId: rSCId,
    } = data;
    const conf: AudioEnginePopulateConfig = { numUsers };
    if (rNumSC !== undefined) conf.requestedNumSoundcardChannels = rNumSC;
    if (rSCId !== undefined) conf.requestedSoundcardId = rSCId;
    return conf;
  }

  private buildAudioMatrixPopulateConfig(
    data: AudioPopulateData,
    engineConfig: AudioEngineConfig,
  ): AudioMatrixPopulateConfig {
    const { numPartylines: numPl, allowedPlsInfos: aPlsInfos } = data;
    const { requestedNumSoundcardChannels: rNumSC, numUsers } = engineConfig;
    const conf: AudioMatrixPopulateConfig = {
      numUsers,
      //We build the audioMatrix based upon the requested number of soundcard channels, not how many channels are actually being used by the engine
      numSoundcardChannels: rNumSC,
    };
    if (numPl !== undefined) conf.numPartylines = numPl;
    if (aPlsInfos !== undefined) conf.allowedPlsInfos = aPlsInfos;
    return conf;
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.startManagers();
  }

  setHandlers(handlers: AudioHandlers): void {
    this.handlers = handlers;
  }

  getAudioInfo(userId: number): AudioInfo | null {
    if (this.audioMatrixManager.status !== "RUNNING") {
      this.logger.error(
        `Unable to get AudioInfo: audioMatrixManager is not running`,
      );
      return null;
    }
    const partylineInfos = this.audioMatrixManager.getPartylineInfos(userId);
    if (partylineInfos === null) return null;

    const mergedPartylines: MergedPartylineInfo[] = partylineInfos.map(
      (plInfo) => ({
        ...plInfo,
        tailState: this.tailManager.getTailState(userId, plInfo.id),
      }),
    );
    return { partylines: mergedPartylines };
  }

  getAllowedPlsInfos(): AllowedPlsInfo[] {
    return this.audioMatrixManager.getAllowedPlsInfos();
  }

  processKeyPress(userId: number, keyPressInfo: KeyPressInfo): void {
    if (this.tailManager.status !== "RUNNING") {
      this.logger.warn(
        `Unable to process key press for userId ${userId}: tailManager is not running`,
      );
      return;
    }
    this.tailManager.processKeyPress(userId, keyPressInfo);
  }

  addRxTrack(userId: number, track: RtcMediaStreamTrack): boolean {
    if (this.webRtcMediaBridge.status !== "RUNNING") {
      this.logger.warn(
        `Will not add RX track for userId ${userId}: the WebRtcMediaBridge is not running.`,
      );
      return false;
    }
    return this.webRtcMediaBridge.addRxTrack(userId, track);
  }

  removeRxTrack(userId: number): boolean {
    if (this.webRtcMediaBridge.status !== "RUNNING") {
      this.logger.warn(
        `Will not remove RX track for userId ${userId}: the WebRtcMediaBridge is not running.`,
      );
      return false;
    }
    return this.webRtcMediaBridge.removeRxTrack(userId);
  }

  getTxTrackAndStream(userId: number): TrackAndStream | null {
    if (this.webRtcMediaBridge.status !== "RUNNING") {
      this.logger.error(
        `Can not get TX track and stream for userId ${userId}: the WebRtcMediaBridge is not running.`,
      );
      return null;
    }
    return this.webRtcMediaBridge.getTxTrackAndStream(userId);
  }

  setRequestedSoundcardId(id: number): boolean {
    const { status, config } = this.audioEngineManager;
    //If we're already successfully using the passed in ID, then we don't need to do anything:
    if (status === "RUNNING" && id === config.soundcardId) {
      return true;
    }
    const { audioPopulateData, snapshot } = this.stopManagers();
    audioPopulateData.requestedSoundcardId = id;
    this.populateManagers(audioPopulateData, snapshot);
    const success = this.startManagers();
    this.activeHandlers.onAudioRestart();
    return success;
  }

  processDisallowedPlsInfos(infos: DisallowedPlsInfo[]): void {
    this.tailManager.processDisallowedPlsInfos(infos);
  }

  getAdminInfos(): AudioAdminInfos {
    const inputGainsInfo = this.audioEngineManager.getAdminInputGainsInfo();
    const partylinesInfo = this.audioMatrixManager.getAdminPartylinesInfo();
    const soundcardsInfo = this.audioEngineManager.getAdminSoundcardsInfo();
    const audioConfigInfo = this.audioMatrixManager.getAdminAudioConfigInfo();
    return {
      inputGainsInfo,
      partylinesInfo,
      soundcardsInfo,
      audioConfigInfo,
    };
  }

  getAdminSoundcardsInfo(): AdminSoundcardsInfo {
    return this.audioEngineManager.getAdminSoundcardsInfo();
  }

  getAdminPartylinesInfo(): AdminPartylinesInfo {
    return this.audioMatrixManager.getAdminPartylinesInfo();
  }

  processAdminUsersChangeRequest(
    changeRequest: AdminUsersChangeRequest,
  ): AudioAdminUsersChangeRequestResult {
    return this.audioMatrixManager.processAdminUsersChangeRequest(
      changeRequest,
    );
  }

  processAdminPartylinesChangeRequest(
    changeRequest: AdminPartylinesChangeRequest,
  ): AudioAdminPartylinesChangeRequestResult {
    return this.audioMatrixManager.processAdminPartylinesChangeRequest(
      changeRequest,
    );
  }

  //Private methods:
  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("AudioController handlers not initialized!");
    return this.handlers;
  }

  private bindListeners(): void {
    this.audioEngineManager.setHandlers({
      onAudio: (b) => this.handleEngineAudio(b),
    });
    this.audioMatrixManager.setHandlers({
      onCrosspointChange: (c) => this.handleMatrixCrosspointChange(c),
    });
    this.tailManager.setHandlers({
      onKeyPress: (p, k) => this.handleTailManagerKeyPress(p, k),
      onUpdateAudioInfo: (p) => this.handleTailManagerUpdateAudioInfo(p),
      onIsSoleActiveTalkKeyForPort: (p, pl) =>
        this.handleIsSoleActiveTalkKeyForPort(p, pl),
      onIsPortTalkingToPartyline: (p, pl) =>
        this.handleIsPortTalkingToPartyline(p, pl),
      onAreAnyOtherTalkKeysActiveForPort: (p, pls) =>
        this.handleAreAnyOtherTalkKeysActiveForPort(p, pls),
      onIsPlAllowedForPortNum: (p, pl) =>
        this.handleTailIsPlAllowedForPortNum(p, pl),
    });
    this.webRtcMediaBridge.setHandlers({
      onAudio: (c, s) => this.handleBridgeAudio(c, s),
      onChannelRoutedChange: (c, r) =>
        this.handleBridgeChannelRoutedChange(c, r),
    });
  }

  private populateManagers(
    data: AudioPopulateData,
    snapshot: AudioMatrixSnapshot | null,
  ): void {
    const engineConfig = this.audioEngineManager.populate(
      this.buildAudioEnginePopulateConfig(data),
    );
    //We want this to be created regardless of whether the audioEngine is ready:
    const matrixConfig = this.audioMatrixManager.populate(
      this.buildAudioMatrixPopulateConfig(data, engineConfig),
      snapshot,
    );
    this.tailManager.populate(matrixConfig);
    //Only populate the webRtcMediaBridge if the audioEngine is ready:
    if (engineConfig.isReady) {
      this.webRtcMediaBridge.populate(engineConfig.numUsers);
    }
  }

  //Returns success
  private startManagers(): boolean {
    const { isReady } = this.audioEngineManager.config;
    if (isReady) {
      this.audioEngineManager.start();
    }
    this.audioMatrixManager.start();
    this.tailManager.start();
    if (isReady) {
      this.webRtcMediaBridge.start();
    }
    return isReady;
  }

  private stopManagers(): {
    audioPopulateData: AudioPopulateData;
    snapshot: AudioMatrixSnapshot | null;
  } {
    const engineConfig = this.audioEngineManager.stop();
    const { config, snapshot } = this.audioMatrixManager.stop();
    const tailSnapshot = this.tailManager.stop();
    this.webRtcMediaBridge.stop();
    return {
      audioPopulateData: this.createAudioPopulateData(engineConfig, config),
      snapshot: this.createAudioMatrixSnapshot(snapshot, tailSnapshot),
    };
  }

  private createAudioPopulateData(
    engineConfig: AudioEngineConfig,
    matrixConfig: AudioMatrixConfig,
  ): AudioPopulateData {
    const {
      numUsers,
      requestedNumSoundcardChannels,
      requestedSoundcardId: rSCId,
    } = engineConfig;

    const { numPartylines, allowedPlsInfos: aPlsInfosSets } = matrixConfig;

    const allowedPlsInfos: AllowedPlsInfo[] = [];
    aPlsInfosSets.forEach((info) => {
      allowedPlsInfos.push({
        userId: info.userId,
        allowedPls: Array.from(info.allowedPls),
      });
    });

    const audioPopulateData: AudioPopulateData = {
      numUsers,
      requestedNumSoundcardChannels,
      numPartylines,
      allowedPlsInfos,
    };
    if (rSCId !== null) {
      audioPopulateData.requestedSoundcardId = rSCId;
    }
    return audioPopulateData;
  }

  private createAudioMatrixSnapshot(
    matrixSnap: AudioMatrixSnapshot | null,
    tailSnap: TailSnapshot,
  ): AudioMatrixSnapshot | null {
    if (!matrixSnap) return null;

    const partylineSnapshots: PartylineSnapshot[] =
      matrixSnap.partylineSnapshots.map((plSnap, plNum) => {
        const { name, portsTalking: pT, portsListening } = plSnap;
        const portsTalking: Set<number> = new Set();
        pT.forEach((portNum) => {
          const tail = tailSnap[portNum]?.[plNum];
          if (!tail) {
            this.logger.error(
              `createAudioMatrixSnapshot: No tail found for portNum ${portNum} and plNum ${plNum}. Will not add the port to the partyline's talks`,
            );
            return;
          }
          //Only add the port as a talker if it is not the result of a tail:
          if (tail.type === "NONE") {
            portsTalking.add(portNum);
          }
        });
        return { name, portsTalking, portsListening };
      });
    return { partylineSnapshots };
  }

  //AudioEngineManager:

  private handleEngineAudio(buffer: Buffer): void {
    if (this.webRtcMediaBridge.status !== "RUNNING") {
      return;
    }
    this.webRtcMediaBridge.pushAudio(buffer);
  }

  //AudioMatrixManager:

  private handleMatrixCrosspointChange(change: CrosspointChange) {
    const { numTotalChannels: numTC } = this.audioEngineManager.config;
    // Guard: only apply crosspoints when the engine is running and the dest/src channels exist.
    // The matrix may include virtual ports beyond the available hardware channel count.
    if (
      this.audioEngineManager.status === "RUNNING" &&
      change.destChannelNum < numTC &&
      change.srcChannelNum < numTC
    ) {
      this.audioEngineManager.updateCrosspoint(change);
    }
  }

  //TailManager:

  private handleTailManagerKeyPress(
    portNum: number,
    keyPressInfo: KeyPressInfo,
  ): void {
    if (this.audioMatrixManager.status !== "RUNNING") {
      this.logger.warn(
        `Unable to handle TailManager key press: audioMatrixManager is not running`,
      );
      return;
    }
    this.audioMatrixManager.processKeyPress(portNum, keyPressInfo);
    // const audioInfo = this.getAudioInfo(portNum);
    // if (!audioInfo) return;
    // this.activeHandlers.onAudioInfoUpdate(portNum, audioInfo);
  }

  private handleTailManagerUpdateAudioInfo(portNum: number): void {
    const audioInfo = this.getAudioInfo(portNum);
    if (!audioInfo) return;
    this.activeHandlers.onAudioInfoUpdate(portNum, audioInfo);
  }

  private handleIsSoleActiveTalkKeyForPort(
    portNum: number,
    plNum: number,
  ): boolean {
    return this.audioMatrixManager.isSoleActiveTalkKeyForPort(portNum, plNum);
  }

  private handleIsPortTalkingToPartyline(
    portNum: number,
    plNum: number,
  ): boolean {
    return this.audioMatrixManager.isPortTalkingToPartyline(portNum, plNum);
  }

  private handleAreAnyOtherTalkKeysActiveForPort(
    portNum: number,
    plNums: ReadonlySet<number>,
  ): boolean {
    return this.audioMatrixManager.areAnyOtherTalkKeysActiveForPort(
      portNum,
      plNums,
    );
  }

  private handleTailIsPlAllowedForPortNum(
    portNum: number,
    plNum: number,
  ): boolean {
    return this.audioMatrixManager.isPlAllowedForPortNum(portNum, plNum);
  }

  //WebRtcMediaBridge:

  private handleBridgeAudio(channelNum: number, samples: Int16Array): void {
    if (this.audioEngineManager.status === "RUNNING") {
      this.audioEngineManager.pushAudio(channelNum, samples);
    }
  }

  private handleBridgeChannelRoutedChange(
    channelNum: number,
    routed: boolean,
  ): boolean {
    if (this.audioEngineManager.status !== "RUNNING") {
      this.logger.warn(
        `Unable to handle bridge channel routed change: audioEngineManager is not running`,
      );
      return false;
    }
    return this.audioEngineManager.setChannelRouted(channelNum, routed);
  }
}
