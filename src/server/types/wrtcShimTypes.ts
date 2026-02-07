import type { RtcIceCandidateInitWire } from "../../shared/types/RtcIceCandidateInitWire.js";

export type RtcPeerConnectionIceEvent = {
  candidate: RtcIceCandidateInitWire | null;
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
  ontrack: ((e: unknown) => void) | null;

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
  close(): void;
};

export interface RtcConfig {
  iceServers?: RtcIceServer[];
  iceTransportPolicy?: string;
}

export interface RtcIceServer {
  urls: string | string[];
  credential?: string;
  username?: string;
}
