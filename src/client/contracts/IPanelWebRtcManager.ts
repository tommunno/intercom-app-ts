import type {
  RtcAnswerWire,
  RtcIceCandidateInitWire,
  RtcOfferWire,
  TurnServerInfo,
} from "../../shared/types/index.js";

export interface PanelWebRtcHandlers {
  onRtcConnected: () => void;
  onRtcDisconnected: () => void;
  onRtcClosed: () => void;
  onRtcFailed: () => void;
  onRtcOffer: (offer: RtcOfferWire) => void;
  onRtcIceCandidate: (candidate: RtcIceCandidateInitWire | null) => void;
  onErrorMessage: (message: string) => void;
}

export interface IPanelWebRtcManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: PanelWebRtcHandlers) => void;
  connect: (turnServerInfo: TurnServerInfo) => Promise<void>;
  setMicMute: (muted: boolean) => void;
  processRemoteAnswer: (answer: RtcAnswerWire) => Promise<void>;
  processRemoteIceCandidate: (
    candidate: RtcIceCandidateInitWire | null,
  ) => Promise<void>;
}
