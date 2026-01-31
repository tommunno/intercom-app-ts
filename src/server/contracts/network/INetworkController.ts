import type { WssSendMessage } from "../../types/index.js";
import type { WebRtcHandlers } from "./IWebRtcManager.js";
import type { WebServerHandlers } from "./IWebServerManager.js";
import type { WssHandlers, WssMessageHandler } from "./IWssManager.js";

export interface NetworkHandlers
  extends WebServerHandlers, WssHandlers, WebRtcHandlers {}

export interface INetworkController {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: NetworkHandlers) => void;
  //WebServerManager:
  setWebServerPorts: (httpPort: number, httpsPort: number) => boolean;

  //WssManager:
  sendWssMessage: WssSendMessage;
  //WssManager Helpers:
  sendLoginFailureMessage: (clientId: string, message?: string) => void;

  //WebRtcManager:
  createRtcPeerConnection: (clientId: string) => void;
  processRtcRemoteOffer: (clientId: string, offer: any) => void;
  processRtcRemoteIceCandidate: (clientId: string, candidate: any) => void;
  closeRtcClient: (clientId: string) => void;
}
