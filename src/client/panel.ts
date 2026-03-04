import type {
  IHttpManager,
  IPanelController,
  IPanelGlobalGuiManager,
  IPanelWebRtcManager,
  IClientLogger,
  ILoginGuiManager,
  IClientWssManager,
} from "./contracts/index.js";
import {
  HttpManager,
  PanelGlobalGuiManager,
  PanelWebRtcManager,
  ClientLogger,
  LoginGuiManager,
  ClientWssManager,
} from "./managers/index.js";
import { PanelController } from "./controllers/index.js";

const logger: IClientLogger = new ClientLogger();
const globalGuiManager: IPanelGlobalGuiManager = new PanelGlobalGuiManager(
  logger,
);
const loginGuiManager: ILoginGuiManager = new LoginGuiManager(logger);
const wssManager: IClientWssManager<"PANEL"> = new ClientWssManager(
  "PANEL",
  logger,
);
const httpManager: IHttpManager = new HttpManager(logger);
const webRtcManager: IPanelWebRtcManager = new PanelWebRtcManager(logger);

const controller: IPanelController = new PanelController(
  globalGuiManager,
  loginGuiManager,
  wssManager,
  httpManager,
  webRtcManager,
  logger,
);

controller.init();
controller.start();
