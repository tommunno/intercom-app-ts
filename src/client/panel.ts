import type {
  IHttpManager,
  IPanelController,
  IPanelGuiManager,
  IPanelWebRtcManager,
  IPanelWssManager,
  IClientLogger,
} from "./contracts/index.js";
import {
  HttpManager,
  PanelGuiManager,
  PanelWebRtcManager,
  PanelWssManager,
  ClientLogger,
} from "./managers/index.js";
import { PanelController } from "./controllers/index.js";

const logger: IClientLogger = new ClientLogger();
const guiManager: IPanelGuiManager = new PanelGuiManager(logger);
const wssManager: IPanelWssManager = new PanelWssManager(logger);
const httpManager: IHttpManager = new HttpManager(logger);
const webRtcManager: IPanelWebRtcManager = new PanelWebRtcManager(logger);

const controller: IPanelController = new PanelController(
  guiManager,
  wssManager,
  httpManager,
  webRtcManager,
  logger,
);

controller.init();
controller.start();
