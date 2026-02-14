import { addIfDefined } from "../../shared/helpers.js";
import type {
  AudioInfo,
  MergedPartylineInfo,
} from "../../shared/types/index.js";
import type {
  AudioEngineConfig,
  AudioEnginePopulateConfig,
  AudioHandlers,
  AudioMatrixConfig,
  AudioMatrixPopulateConfig,
  IAudioController,
  IAudioEngineManager,
  IAudioMatrixManager,
  ILogger,
  ITailManager,
  IWebRtcMediaBridge,
} from "../contracts/index.js";
import { startSineTest, startSweepTest } from "../serverHelpers.js";
import type {
  AudioPopulateData,
  KeyPressInfo,
  RtcMediaStreamTrack,
  TrackAndStream,
} from "../types/index.js";

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
    const matrixConfig = this.audioMatrixManager.populate(
      this.buildAudioMatrixPopulateConfig(data, engineConfig),
    );
    this.tailManager.populate(matrixConfig);
    this.webRtcMediaBridge.populate(matrixConfig.numUsers);
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
    this.audioEngineManager.start();
    this.audioMatrixManager.start();
    this.tailManager.start();
    this.webRtcMediaBridge.start();
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
    return this.webRtcMediaBridge.addRxTrack(userId, track);
  }

  removeRxTrack(userId: number): boolean {
    return this.webRtcMediaBridge.removeRxTrack(userId);
  }

  getTxTrackAndStream(channelNum: number): TrackAndStream | null {
    return this.webRtcMediaBridge.getTxTrackAndStream(channelNum);
  }

  //Private methods:
  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("AudioController handlers not initialized!");
    return this.handlers;
  }

  private bindListeners(): void {
    this.audioEngineManager.setHandlers({});
    this.tailManager.setHandlers({
      onKeyPress: (u, k) => this.handleTailManagerKeyPress(u, k),
    });
    this.webRtcMediaBridge.setHandlers({
      onAudio: (c, s) => this.handleBridgeAudio(c, s),
    });
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
}
