import type {
  AudioInfo,
  MergedPartylineInfo,
} from "../../shared/types/index.js";
import type {
  AudioHandlers,
  IAudioController,
  IAudioMatrixManager,
  ILogger,
  ITailManager,
  IWebRtcMediaBridge,
} from "../contracts/index.js";
import type { AudioPopulateData, KeyPressInfo } from "../types/index.js";

export class AudioController implements IAudioController {
  private handlers: AudioHandlers | null = null;

  constructor(
    private audioMatrixManager: IAudioMatrixManager,
    private tailManager: ITailManager,
    private webRtcMediaBridge: IWebRtcMediaBridge,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "AudioController" });
  }

  init(): void {
    this.bindListeners();
    this.audioMatrixManager.init();
    this.tailManager.init();
    this.webRtcMediaBridge.init();
  }

  populate(data: AudioPopulateData): void {
    const audioConfig = this.audioMatrixManager.populate(data.audioMatrixData);
    this.tailManager.populate(audioConfig);
    this.webRtcMediaBridge.populate(audioConfig.numUsers);
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.audioMatrixManager.start();
    this.tailManager.start();
    this.webRtcMediaBridge.start();
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

  processKeyPress(keyPressInfo: KeyPressInfo, userId: number): void {
    this.tailManager.processKeyPress(keyPressInfo, userId);
  }

  //Private methods:
  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("AudioController handlers not initialized!");
    return this.handlers;
  }

  private bindListeners(): void {
    this.tailManager.setHandlers({
      onKeyPress: (k, u) => this.handleTailManagerKeyPress(k, u),
    });
    this.webRtcMediaBridge.setHandlers({
      onAudio: (c, s) => this.handleBridgeAudio(c, s),
    });
  }

  //TailManager:

  private handleTailManagerKeyPress(
    keyPressInfo: KeyPressInfo,
    userId: number,
  ): void {
    this.audioMatrixManager.processKeyPress(keyPressInfo, userId);
    const audioInfo = this.getAudioInfo(userId);
    if (!audioInfo) return;
    this.activeHandlers.onAudioInfoUpdate(userId, audioInfo);
  }

  //WebRtcMediaBridge:

  private handleBridgeAudio(channelNum: number, samples: any): void {
    // this.logger.info(`Bridge audio for channelNum ${channelNum}`, samples);
  }
}
