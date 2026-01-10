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
  ) {}
}
