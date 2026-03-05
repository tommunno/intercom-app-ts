import type { ISetupSectionGuiManager } from "./ISetupSectionGuiManager.js";

export interface WebServerSectionGuiManagerHandlers {}

export interface IWebServerSectionGuiManager extends ISetupSectionGuiManager {
  setHandlers: (handlers: WebServerSectionGuiManagerHandlers) => void;
}
