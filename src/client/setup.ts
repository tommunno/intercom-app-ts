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
  WebServerSectionGuiManager,
} from "./managers/index.js";
import { SetupController } from "./controllers/SetupController.js";
import type { SetupSections } from "../shared/types/SetupSections.js";
import { UsersSectionGuiManager } from "./managers/setup-sections/UsersSectionGuiManager.js";

const logger: IClientLogger = new ClientLogger();
const globalGuiManager: ISetupGlobalGuiManager = new SetupGlobalGuiManager(
  logger,
);
const loginGuiManager: ILoginGuiManager = new LoginGuiManager(logger);

const sections: SetupSections = {
  webServer: new WebServerSectionGuiManager(logger),
  users: new UsersSectionGuiManager(logger),
};

const wssManager: IClientWssManager<"SETUP"> = new ClientWssManager(
  "SETUP",
  logger,
);

const httpManager: IHttpManager = new HttpManager(logger);
const controller: ISetupController = new SetupController(
  globalGuiManager,
  loginGuiManager,
  sections,
  wssManager,
  httpManager,
  logger,
);

controller.init();
controller.start();
