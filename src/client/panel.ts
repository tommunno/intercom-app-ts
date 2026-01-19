import type {
  IHttpManager,
  IPanelController,
  IPanelGuiManager,
  IWebRtcManager,
  IPanelWssManager,
} from "./contracts/index.js";
import {
  HttpManager,
  PanelGuiManager,
  WebRtcManager,
  PanelWssManager,
} from "./managers/index.js";
import { PanelController } from "./controllers/index.js";

const guiManager: IPanelGuiManager = new PanelGuiManager();
const wssManager: IPanelWssManager = new PanelWssManager();
const httpManager: IHttpManager = new HttpManager();
const webRtcManager: IWebRtcManager = new WebRtcManager();

const controller: IPanelController = new PanelController(
  guiManager,
  wssManager,
  httpManager,
  webRtcManager,
);

controller.init();
controller.start();
