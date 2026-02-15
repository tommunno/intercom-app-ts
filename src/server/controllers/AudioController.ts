//Types:
import type {
  AudioInfo,
  MergedPartylineInfo,
} from "../../shared/types/index.js";
import type {
  AudioEngineConfig,
  AudioEnginePopulateConfig,
  AudioHandlers,
  AudioMatrixPopulateConfig,
  IAudioController,
  IAudioEngineManager,
  IAudioMatrixManager,
  ILogger,
  ITailManager,
  IWebRtcMediaBridge,
} from "../contracts/index.js";
import type {
  AudioPopulateData,
  KeyPressInfo,
  RtcMediaStreamTrack,
  TrackAndStream,
} from "../types/index.js";
//Helpers:
import { addIfDefined } from "../../shared/helpers.js";
import { startSineTest, startSweepTest } from "../serverHelpers.js";
import { channel } from "node:diagnostics_channel";

export class AudioController implements IAudioController {
  private handlers: AudioHandlers | null = null;
  //Test:
  // private logIndex: number = 0;
  //End test

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
    const engineConfig = this.audioEngineManager.populate(
      this.buildAudioEnginePopulateConfig(data),
    );
    //We want this to be created regardless of whether the audioEngine is ready
    const matrixConfig = this.audioMatrixManager.populate(
      this.buildAudioMatrixPopulateConfig(data, engineConfig),
    );
    this.tailManager.populate(matrixConfig);
    //Only populate the webRtcMedia if the audioEngine is ready
    if (engineConfig.isReady) {
      this.webRtcMediaBridge.populate(engineConfig.numUsers);
    }
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
    const { numPartylines: numPl } = data;
    const { requestedNumSoundcardChannels: rNumSC, numUsers } = engineConfig;
    const conf: AudioMatrixPopulateConfig = {
      numUsers,
      //We build the audioMatrix based upon the requested number of soundcard channels, not how many channels are actually being used by the engine
      numSoundcardChannels: rNumSC,
    };
    if (numPl !== undefined) conf.numPartylines = numPl;
    return conf;
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    const { isReady } = this.audioEngineManager.config;
    if (isReady) {
      this.audioEngineManager.start();
    }
    this.audioMatrixManager.start();
    this.tailManager.start();
    if (isReady) {
      this.webRtcMediaBridge.start();
    }
    //Test:
    this.audioEngineManager.updateCrosspoint(0, 1, true);
    //End test
    //Test:
    // startSweepTest(
    //   this.webRtcMediaBridge.pushAudio.bind(this.webRtcMediaBridge),
    // );
    //End test
  }

  setHandlers(handlers: AudioHandlers): void {
    this.handlers = handlers;
  }

  connectUser(userId: number, clientId: string): boolean {
    this.logger.info(
      `Connected user with userId of ${userId} and clientId of ${clientId}`,
    );
    return true;
  }

  disconnectUser(userId: number): boolean {
    this.logger.info(`Disconnected user with userId of ${userId}`);
    return true;
  }

  getAudioInfo(userId: number): AudioInfo | null {
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

  processKeyPress(userId: number, keyPressInfo: KeyPressInfo): void {
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
      this.logger.warn(
        `Can not get TX track and stream for userId ${userId}: the WebRtcMediaBridge is not running.`,
      );
      return null;
    }
    return this.webRtcMediaBridge.getTxTrackAndStream(userId);
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
    this.tailManager.setHandlers({
      onKeyPress: (u, k) => this.handleTailManagerKeyPress(u, k),
    });
    this.webRtcMediaBridge.setHandlers({
      onAudio: (c, s) => this.handleBridgeAudio(c, s),
      onChannelRoutedChange: (c, r) =>
        this.handleBridgeChannelRoutedChange(c, r),
    });
  }

  //AudioEngineManager:

  private handleEngineAudio(buffer: Buffer): void {
    if (this.webRtcMediaBridge.status !== "RUNNING") {
      return;
    }
    this.webRtcMediaBridge.pushAudio(buffer);
  }

  //TailManager:

  private handleTailManagerKeyPress(
    userId: number,
    keyPressInfo: KeyPressInfo,
  ): void {
    this.audioMatrixManager.processKeyPress(userId, keyPressInfo);
    const audioInfo = this.getAudioInfo(userId);
    if (!audioInfo) return;
    this.activeHandlers.onAudioInfoUpdate(userId, audioInfo);
  }

  //WebRtcMediaBridge:

  private handleBridgeAudio(channelNum: number, samples: Int16Array): void {
    this.audioEngineManager.pushAudio(channelNum, samples);
    //Test:
    // if (this.logIndex === 0) {
    //   this.logger.info(`Bridge audio for channelNum ${channelNum}`, samples);
    // } else if (this.logIndex === 50) {
    //   this.logIndex = 0;
    //   return;
    // }
    // this.logIndex++;
    //End test
  }

  private handleBridgeChannelRoutedChange(
    channelNum: number,
    routed: boolean,
  ): boolean {
    return this.audioEngineManager.setChannelRouted(channelNum, routed);
  }
}
