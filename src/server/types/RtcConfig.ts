import type { IceServer } from "./IceServer.js";

export interface RtcConfig {
  iceServers?: IceServer[];
}
