import type { WssSendMessage } from "../../types/index.js";
import type { WebServerHandlers } from "./IWebServerManager.js";
import type { WssHandlers, WssMessageHandler } from "./IWssManager.js";

export interface NetworkHandlers extends WebServerHandlers, WssHandlers {}

export interface INetworkController {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: NetworkHandlers) => void;
  setWebServerPorts: (httpPort: number, httpsPort: number) => boolean;
  sendWssMessage: WssSendMessage;
  //Helpers:
  sendLoginFailureMessage: (clientId: string, message?: string) => void;
}
