import type {
  IPanelController,
  IPanelGuiManager,
  IWebRtcManager,
  IWssManager,
} from "./contracts/index.js";
import {
  PanelGuiManager,
  WebRtcManager,
  WssManager,
} from "./managers/index.js";
import { PanelController } from "./controllers/index.js";

const guiManager: IPanelGuiManager = new PanelGuiManager();
const wssManager: IWssManager = new WssManager();
const webRtcManager: IWebRtcManager = new WebRtcManager();

const controller: IPanelController = new PanelController(
  guiManager,
  wssManager,
  webRtcManager,
);

controller.init();
controller.start();
