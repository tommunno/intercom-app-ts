export type RtcPeerConnectionIceEvent = {
  candidate: {
    toJSON?: () => unknown;
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  } | null;
};

export interface RtcPeerConnectionIceErrorEvent {
  errorCode: number;
  errorText?: string;
  address?: string;
  url?: string;
}

export type RtcPeerConnection = {
  onconnectionstatechange: ((e?: unknown) => void) | null;
  onicecandidate: ((e: RtcPeerConnectionIceEvent) => void) | null;
  onicecandidateerror: ((e: RtcPeerConnectionIceErrorEvent) => void) | null;
  oniceconnectionstatechange: ((e?: unknown) => void) | null;
  ontrack: ((e: RtcTrackEvent) => void) | null;

  connectionState:
    | "new"
    | "connecting"
    | "connected"
    | "disconnected"
    | "failed"
    | "closed";
  signalingState:
    | "stable"
    | "have-local-offer"
    | "have-remote-offer"
    | "have-local-pranswer"
    | "have-remote-pranswer"
    | "closed";
  iceConnectionState:
    | "new"
    | "checking"
    | "connected"
    | "completed"
    | "failed"
    | "disconnected"
    | "closed";

  localDescription: {
    sdp: string;
    type: "offer" | "answer" | "pranswer" | "rollback";
  } | null;
  remoteDescription: unknown | null;

  createOffer(): Promise<{ sdp?: string; type: string }>;
  createAnswer(): Promise<{ sdp?: string; type: string }>;
  setLocalDescription(desc: unknown): Promise<void> | void;
  setRemoteDescription(desc: unknown): Promise<void> | void;
  addIceCandidate(cand: unknown): Promise<void> | void;
  addTrack(track: RtcMediaStreamTrack, stream: RtcMediaStream): unknown;
  close(): void;
};

export interface RtcConfig {
  iceServers?: RtcIceServer[];
  iceTransportPolicy?: "all" | "relay";
}

export interface RtcIceServer {
  urls: string | string[];
  credential?: string;
  username?: string;
}

export type RtcMediaStreamTrack = {
  kind?: string;
  id?: string;
  enabled?: boolean;
  muted?: boolean;
  readyState?: "live" | "ended";
  stop?: () => void;
};

export type RtcMediaStream = {
  id?: string;
  addTrack: (track: RtcMediaStreamTrack) => void;
  removeTrack?: (track: RtcMediaStreamTrack) => void;
  getTracks?: () => RtcMediaStreamTrack[];
};

export type RtcTrackEvent = {
  track?: RtcMediaStreamTrack;
  streams?: RtcMediaStream[];
};
