import type * as wrtcTypes from "@roamhq/wrtc";
import type { RtcIceCandidateInitWire } from "../../shared/types/RtcIceCandidateInitWire.js";
import type { RtcPeerConnection } from "./wrtcShimTypes.js";

export interface PeerConnectionInfo {
  pc: RtcPeerConnection;
  closed: boolean;
  disconnectTimeoutId: ReturnType<typeof setTimeout> | null;
  remoteIceCandidates: (RtcIceCandidateInitWire | null)[];
  rxTrackReceived: boolean;
  txTrackAdded: boolean;
}
