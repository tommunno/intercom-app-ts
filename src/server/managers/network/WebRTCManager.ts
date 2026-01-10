import type { IWebRtcManager, ILogger } from "../../contracts/index.js";

export class WebRtcManager implements IWebRtcManager {
  constructor(private logger: ILogger) {}
}
