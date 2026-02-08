import type {
  RtcIceCandidateInitWire,
  RtcOfferWire,
  TurnServerInfo,
} from "../../../shared/types/index.js";
import type {
  NetworkData,
  TrackAndStream,
  WssSendMessage,
} from "../../types/index.js";
import type { WebRtcHandlers } from "./IWebRtcManager.js";
import type { WebServerHandlers } from "./IWebServerManager.js";
import type { WssHandlers } from "./IWssManager.js";

export interface NetworkHandlers
  extends WebServerHandlers, WssHandlers, WebRtcHandlers {}

export interface INetworkController {
  init: () => void;
  populate: (data: NetworkData) => void;
  start: () => void;
  setHandlers: (handlers: NetworkHandlers) => void;

  //WssManager:
  sendWssMessage: WssSendMessage;
  //WssManager Helpers:
  sendLoginFailureMessage: (clientId: string, message?: string) => void;

  //WebRtcManager:
  createRtcPeerConnection: (clientId: string) => void;
  processRtcRemoteOffer: (clientId: string, offer: RtcOfferWire) => void;
  processRtcRemoteIceCandidate: (
    clientId: string,
    candidate: RtcIceCandidateInitWire | null,
  ) => void;
  addRtcTxTrackAndStream: (
    clientId: string,
    trackAndStream: TrackAndStream,
  ) => void;
  closeRtcClient: (clientId: string) => void;

  getTurnServerInfo: () => TurnServerInfo | null;
}
