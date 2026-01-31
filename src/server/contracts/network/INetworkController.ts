import type { TurnServerInfo } from "../../../shared/types/index.js";
import type { NetworkData, WssSendMessage } from "../../types/index.js";
import type { WebRtcHandlers } from "./IWebRtcManager.js";
import type { WebServerHandlers } from "./IWebServerManager.js";
import type { WssHandlers } from "./IWssManager.js";

export interface NetworkHandlers
  extends WebServerHandlers, WssHandlers, WebRtcHandlers {}

export interface INetworkController {
  init: () => void;
  start: () => void;
  populate: (data: NetworkData) => void;
  setHandlers: (handlers: NetworkHandlers) => void;

  //WssManager:
  sendWssMessage: WssSendMessage;
  //WssManager Helpers:
  sendLoginFailureMessage: (clientId: string, message?: string) => void;

  //WebRtcManager:
  createRtcPeerConnection: (clientId: string) => void;
  processRtcRemoteOffer: (clientId: string, offer: any) => void;
  processRtcRemoteIceCandidate: (clientId: string, candidate: any) => void;
  closeRtcClient: (clientId: string) => void;

  getTurnServerInfo: () => TurnServerInfo | null;
}
