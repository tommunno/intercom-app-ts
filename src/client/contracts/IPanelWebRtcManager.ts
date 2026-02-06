import type { TurnServerInfo } from "../../shared/types/index.js";

export interface PanelWebRtcHandlers {
  onRtcConnected: () => void;
  onRtcDisconnected: () => void;
  onRtcClosed: () => void;
  onRtcFailed: () => void;
  onRtcOffer: (offer: any) => void;
  onRtcIceCandidate: (candidate: any) => void;
}

export interface IPanelWebRtcManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: PanelWebRtcHandlers) => void;
  connect: (turnServerInfo: TurnServerInfo) => Promise<void>;
  processRemoteAnswer: (answer: any) => Promise<void>;
  processRemoteIceCandidate: (candidate: any) => Promise<void>;
}
