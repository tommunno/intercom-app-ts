import type { IWebRTCManager, ILogger } from "../../contracts/index.js";

export class WebRTCManager implements IWebRTCManager {
  constructor(private logger: ILogger) {}
}
