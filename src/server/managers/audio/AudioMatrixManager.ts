import type {
  IAudioMatrixManager,
  ILogger,
  IWebRtcMediaBridge,
} from "../../contracts/index.js";

export class AudioMatrixManager implements IAudioMatrixManager {
  constructor(
    private webRTCMediaBridge: IWebRtcMediaBridge,
    private logger: ILogger
  ) {}
}
