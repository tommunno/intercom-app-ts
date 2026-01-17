import type { WssPayloads, WssType } from "../../../shared/protocols/index.js";
import type { Servers, WssMessageInfo } from "../../types/index.js";

export interface WssHandlers {
  onMessage: WssMessageHandler;
  onClientDisconnect(clientId: string): void;
  onClientError(clientId: string): void;
}

export type WssMessageHandler = <K extends WssType>(
  messageInfo: WssMessageInfo<K>,
) => void;

export interface IWssManager {
  init: (servers: Servers) => void;
  start: () => void;
  setHandlers: (handlers: WssHandlers) => void;
}
