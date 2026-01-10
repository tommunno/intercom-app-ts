import type { ILogger, IWebRTCMediaBridge } from "../../contracts/index.js";

export class WebRTCMediaBridge implements IWebRTCMediaBridge {
  constructor(private logger: ILogger) {}
}
