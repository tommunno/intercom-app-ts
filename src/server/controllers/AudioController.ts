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

  connectUser(authResult: AuthResult): void {
    this.logger.info(`Connected user with userUid of ${authResult.userUid}`);
  }
}
