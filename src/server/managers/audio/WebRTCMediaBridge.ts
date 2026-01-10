import type { ILogger, IWebRtcMediaBridge } from "../../contracts/index.js";

export class WebRtcMediaBridge implements IWebRtcMediaBridge {
  constructor(private logger: ILogger) {}
}
