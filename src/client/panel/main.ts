import type {
  IPanelController,
  IPanelGlobalGuiManager,
  IPanelWebRtcManager,
  ILoginGuiManager,
} from "./contracts/index.js";
import type {
  IHttpManager,
  IClientWssManager,
} from "../shared/contracts/index.js";
import {
  PanelGlobalGuiManager,
  PanelWebRtcManager,
  LoginGuiManager,
} from "./managers/index.js";
import { HttpManager, ClientWssManager } from "../shared/managers/index.js";
import { PanelController } from "./controllers/PanelController.js";
import logger from "../shared/logging/logger.js";

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
