import type { ISetupSectionGuiManager } from "./ISetupSectionGuiManager.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future handlers
export interface WebServerSectionGuiManagerHandlers {}

export interface IWebServerSectionGuiManager extends ISetupSectionGuiManager {
  setHandlers: (handlers: WebServerSectionGuiManagerHandlers) => void;
}
