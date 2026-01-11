import type { AuthResult } from "../../shared/types/index.js";
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
    private logger: ILogger
  ) {
    this.logger = this.logger.child({ context: "AudioController" });
  }

  start(): void {}

  init(): void {}

  connectUser(userId: number, clientId: string): void {
    this.logger.info(
      `Connected user with userId of ${userId} and clientId of ${clientId}`
    );
  }

  disconnectUser(userId: number): void {
    this.logger.info(`Disconnected user with userId of ${userId}`);
  }
}
