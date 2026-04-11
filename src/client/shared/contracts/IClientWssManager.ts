import type {
  WssDownstream,
  WssDownstreamPanel,
  WssDownstreamSetup,
  WssPayloads,
  WssUpstream,
} from "../../../shared/protocols/index.js";

export interface ClientWssHandlers<M extends ClientWssMode> {
  onOpen: () => void;
  onClose: () => void;
  onError: () => void;
  onMessage: ClientWssMessageHandler<DownstreamForMode<M>>;
  onServerRestored: () => void;
  onHeartbeatTimeout: () => void;
}

export type ClientWssMessageHandler<K extends WssDownstream> = <L extends K>(
  type: L,
  payload: WssPayloads[L],
) => void;

export type ClientWssMode = "PANEL" | "SETUP";

export type DownstreamForMode<M extends ClientWssMode> = M extends "PANEL"
  ? WssDownstreamPanel
  : M extends "SETUP"
    ? WssDownstreamSetup
    : never;

export interface IClientWssManager<M extends ClientWssMode> {
  readonly mode: M;
  init: () => void;
  start: () => void;
  isRunning: boolean;
  setHandlers: (handlers: ClientWssHandlers<M>) => void;
  sendMessage: <L extends WssUpstream>(
    type: L,
    payload: WssPayloads[L],
  ) => void;
  monitorServerRecovery: (monitor: boolean) => void;
  monitorHeartbeatWatchdog: (monitor: boolean) => void;
  notifyHeartbeatReceived: () => void;
}
