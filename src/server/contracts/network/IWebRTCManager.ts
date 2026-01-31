import type { TurnServerCredentials } from "../../../shared/types/TurnServerCredentials.js";

export interface WebRtcHandlers {
  onRtcConnected: (clientId: string) => void;
  onRtcDisconnected: (clientId: string) => void;
  onRtcClosed: (clientId: string) => void;
  onRtcFailed: (clientId: string) => void;
  onRtcAnswer: (clientId: string, answer: any) => void;
  onRtcIceCandidate: (clientId: string, candidate: any) => void;
}

export interface IWebRtcManager {
  init: (turnServerCredentials: TurnServerCredentials) => void;
  start: () => void;
  setHandlers: (handlers: WebRtcHandlers) => void;
  generateRtcConfig: (turnServerUrl: string) => void;
  createPeerConnection: (clientId: string) => void;
  processRemoteOffer: (clientId: string, offer: any) => Promise<void>;
  processRemoteIceCandidate: (
    clientId: string,
    candidate: any,
  ) => Promise<void>;
  closeClient: (clientId: string) => void;
}
