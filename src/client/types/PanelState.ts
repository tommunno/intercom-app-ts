import type { PanelConnectionStatus } from "./PanelConnectionStatus.js";

export interface PanelState {
  connection: { status: PanelConnectionStatus };
  user: { loggedIn: boolean; username: string };
}
