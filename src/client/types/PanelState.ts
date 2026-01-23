import type { PanelConnectionStatus } from "./PanelConnectionStatus.js";
import type { UserInfo, AudioInfo } from "../../shared/types/index.js";

export interface PanelState {
  audioConnection: { status: PanelConnectionStatus };
  userInfo: UserInfo;
  audioInfo: AudioInfo;
}
