import type {
  WssDownstream,
  WssPayloads,
  WssUpstream,
} from "../../../shared/protocols/index.js";
import type { Servers, WssMessageInfo } from "../../types/index.js";
import type { WssSendMessage } from "../../types/index.js";

export interface WssHandlers {
  onMessage: WssMessageHandler;
  onClientDisconnect(clientId: string): void;
  onClientError(clientId: string): void;
}

export type WssMessageHandler = <K extends WssUpstream>(
  messageInfo: WssMessageInfo<K>,
) => void;

export interface IWssManager {
  init: (servers: Servers) => void;
  start: () => void;
  setHandlers: (handlers: WssHandlers) => void;
  sendMessage: WssSendMessage;
}
