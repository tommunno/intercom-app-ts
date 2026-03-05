import type { SetupState } from "../../types/SetupState.js";

export interface ISetupSectionGuiManager {
  init(): void;
  start(): void;
  displayState(state: SetupState): void;
}
