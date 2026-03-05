import type {
  IUsersSectionGuiManager,
  IWebServerSectionGuiManager,
} from "../../client/contracts/index.js";

export interface SetupSections {
  webServer: IWebServerSectionGuiManager;
  users: IUsersSectionGuiManager;
}
