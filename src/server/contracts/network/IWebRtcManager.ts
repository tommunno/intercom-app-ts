import type { RtcAnswerWire } from "../../../shared/types/RtcAnswerWire.js";
import type { RtcIceCandidateInitWire } from "../../../shared/types/RtcIceCandidateInitWire.js";
import type { RtcOfferWire } from "../../../shared/types/RtcOfferWire.js";
import type { TurnServerCredentials } from "../../../shared/types/TurnServerCredentials.js";
import type { TrackAndStream } from "../../types/TrackAndStream.js";

export interface WebRtcHandlers {
  onRtcConnected: (clientId: string) => void;
  onRtcDisconnected: (clientId: string) => void;
  onRtcClosed: (clientId: string) => void;
  onRtcFailed: (clientId: string) => void;
  onRtcAnswer: (clientId: string, answer: RtcAnswerWire) => void;
  onRtcIceCandidate: (
    clientId: string,
    candidate: RtcIceCandidateInitWire | null,
  ) => void;
  onRtcTrack: (clientId: string, track: any) => void;
}

export interface IWebRtcManager {
  init: (turnServerCredentials: TurnServerCredentials) => void;
  populate: (turnServerUrl: string) => void;
  start: () => void;
  setHandlers: (handlers: WebRtcHandlers) => void;
  createPeerConnection: (clientId: string) => void;
  processRemoteOffer: (clientId: string, offer: RtcOfferWire) => Promise<void>;
  processRemoteIceCandidate: (
    clientId: string,
    candidate: RtcIceCandidateInitWire | null,
  ) => Promise<void>;
  addTxTrackAndStream: (
    clientId: string,
    trackAndStream: TrackAndStream,
  ) => void;
  closeClient: (clientId: string) => void;
}
