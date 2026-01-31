import type * as wrtcTypes from "@roamhq/wrtc";

export interface PeerConnectionInfo {
  pc: wrtcTypes.RTCPeerConnection;
  closed: boolean;
  disconnectTimeoutId: ReturnType<typeof setTimeout> | null;
  remoteIceCandidates: any[];
}
