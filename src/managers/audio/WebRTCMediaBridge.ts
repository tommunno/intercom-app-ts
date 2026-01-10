import type { ILogger, IWebRTCMediaBridge } from "../../contracts";

export class WebRTCMediaBridge implements IWebRTCMediaBridge {
  constructor(private logger: ILogger) {}
}
