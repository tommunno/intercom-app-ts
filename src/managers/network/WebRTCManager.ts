import type { IWebRTCManager, ILogger } from "../../contracts";

export class WebRTCManager implements IWebRTCManager {
  constructor(private logger: ILogger) {}
}
