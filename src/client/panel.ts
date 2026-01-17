import type {
  IHttpManager,
  IPanelController,
  IPanelGuiManager,
  IWebRtcManager,
  IWssManager,
} from "./contracts/index.js";
import {
  HttpManager,
  PanelGuiManager,
  WebRtcManager,
  WssManager,
} from "./managers/index.js";
import { PanelController } from "./controllers/index.js";

const guiManager: IPanelGuiManager = new PanelGuiManager();
const wssManager: IWssManager = new WssManager();
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
