import type {
  IAudioMatrixManager,
  ILogger,
  IWebRTCMediaBridge,
} from "../../contracts";

export class AudioMatrixManager implements IAudioMatrixManager {
  constructor(
    private webRTCMediaBridge: IWebRTCMediaBridge,
    private logger: ILogger
  ) {}
}
