import type { PanelConnectionStatus } from "./PanelConnectionStatus.js";
import type {
  UserInfo,
  AudioInfo,
  TurnServerInfo,
} from "../../../shared/types/index.js";

export interface PanelState {
  audioConnection: { status: PanelConnectionStatus };
  userInfo: UserInfo;
  audioInfo: AudioInfo;
  turnServerInfo: TurnServerInfo | null;
  attemptingAutomaticLogin: boolean;
  userMicMuted: boolean;
}
