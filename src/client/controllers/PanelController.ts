import type {
  IPanelController,
  IPanelGuiManager,
  IWebRtcManager,
  IWssManager,
} from "../contracts/index.js";

export class PanelController implements IPanelController {
  constructor(
    private guiManager: IPanelGuiManager,
    private wssManager: IWssManager,
    private webRtcManager: IWebRtcManager,
  ) {}

  init(): void {
    console.log("Panel controller initialising");
  }

  start(): void {
    console.log("Panel controller starting");
  }
}
