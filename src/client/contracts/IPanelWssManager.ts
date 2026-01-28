import type {
  WSS_DOWNSTREAM,
  WssDownstream,
  WssPayloads,
  WssUpstream,
} from "../../shared/protocols/index.js";

export interface PanelWssHandlers {
  onOpen: () => void;
  onClose: () => void;
  onError: () => void;
  onMessage: PanelWssMessageHandler;
  onServerRestored: () => void;
  onHeartbeatTimeout: () => void;
}

export type PanelWssMessageHandler = <K extends WssDownstream>(
  type: K,
  payload: WssPayloads[K],
) => void;

export interface IPanelWssManager {
  init: () => void;
  start: () => void;
  isRunning: boolean;
  setHandlers: (handlers: PanelWssHandlers) => void;
  sendMessage: <K extends WssUpstream>(
    type: K,
    payload: WssPayloads[K],
  ) => void;
  monitorServerRecovery: (monitor: boolean) => void;
  monitorHeartbeatWatchdog: (monitor: boolean) => void;
  notifyHeartbeatReceived: () => void;
}
