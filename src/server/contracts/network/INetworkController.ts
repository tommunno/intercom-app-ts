import type {
  AdminUpdate,
  AdminWebServerInfo,
  RtcIceCandidateInitWire,
  RtcOfferWire,
  TurnServerInfo,
} from "../../../shared/types/index.js";
import type {
  NetworkData,
  TrackAndStream,
  WssSendMessage,
} from "../../types/index.js";
import type { ProcessStatsHandlers } from "./IProcessStatsManager.js";
import type { WebRtcHandlers } from "./IWebRtcManager.js";
import type { WebServerHandlers } from "./IWebServerManager.js";
import type { WssHandlers } from "./IWssManager.js";

export interface NetworkAdminInfos {
  webServerInfo: AdminWebServerInfo;
}

export interface SendAdminUpdateAndPopupsParams {
  updateTarget: string;
  update: AdminUpdate;
  originClientId: string;
  loggedInClientIds: string[];
}

export interface NetworkHandlers
  extends
    WebServerHandlers,
    WssHandlers,
    WebRtcHandlers,
    ProcessStatsHandlers {}

export interface INetworkController {
  init: () => Promise<void>;
  populate: (data: NetworkData) => Promise<void>;
  start: () => void;
  setHandlers: (handlers: NetworkHandlers) => void;

  //WssManager:
  sendWssMessage: WssSendMessage;
  sendAdminUpdateAndPopups: (params: SendAdminUpdateAndPopupsParams) => void;
  //WssManager Helpers:
  sendUserLoginFailureMessage: (clientId: string, message?: string) => void;
  sendAdminLoginFailureMessage: (clientId: string, message?: string) => void;

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

  getAdminWebServerInfo: () => AdminWebServerInfo;
  getAdminInfos: () => NetworkAdminInfos;
}
