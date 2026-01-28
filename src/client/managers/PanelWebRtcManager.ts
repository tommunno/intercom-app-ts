import type { IClientLogger, IPanelWebRtcManager } from "../contracts/index.js";

export class PanelWebRtcManager implements IPanelWebRtcManager {
  init(): void {}
  start(): void {}

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "PanelWebRTCManager" });
  }
}
