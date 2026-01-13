import type { WssPayloads } from "../../../shared/protocols/index.js";
import type { Servers } from "../../types/index.js";

export interface WssHandlers {
  onMessage: WssMessageHandler;
}

export type WssMessageHandler = <K extends keyof WssPayloads>(
  type: K,
  payload: WssPayloads[K],
  clientId: string
) => void;

export interface IWssManager {
  init(servers: Servers): void;
  start(): void;
  setHandlers(handlers: WssHandlers): void;
}
