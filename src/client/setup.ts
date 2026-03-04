import type {
  IClientLogger,
  IClientWssManager,
  IHttpManager,
  ILoginGuiManager,
  ISetupController,
  ISetupGlobalGuiManager,
} from "./contracts/index.js";
import {
  ClientLogger,
  ClientWssManager,
  HttpManager,
  LoginGuiManager,
  SetupGlobalGuiManager,
} from "./managers/index.js";
import { SetupController } from "./controllers/SetupController.js";

const logger: IClientLogger = new ClientLogger();
const globalGuiManager: ISetupGlobalGuiManager = new SetupGlobalGuiManager(
  logger,
);
const loginGuiManager: ILoginGuiManager = new LoginGuiManager(logger);
const wssManager: IClientWssManager<"SETUP"> = new ClientWssManager(
  "SETUP",
  logger,
);
const httpManager: IHttpManager = new HttpManager(logger);
const controller: ISetupController = new SetupController(
  globalGuiManager,
  loginGuiManager,
  wssManager,
  httpManager,
  logger,
);

controller.init();
controller.start();
