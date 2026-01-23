import type {
  AudioInfo,
  MergedPartylineInfo,
} from "../../shared/types/index.js";
import type {
  IAudioController,
  IAudioMatrixManager,
  ILogger,
  ITailManager,
} from "../contracts/index.js";

export class AudioController implements IAudioController {
  constructor(
    private audioMatrixManager: IAudioMatrixManager,
    private tailManager: ITailManager,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "AudioController" });
  }

  init(): void {
    const config = {
      numUsers: 16,
      numSoundcardChannels: 12,
      numPartylines: 8,
    };

    this.audioMatrixManager.init(config);
    this.tailManager.init(config);
  }

  start(): void {
    this.audioMatrixManager.start();
    this.tailManager.start();
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
}
