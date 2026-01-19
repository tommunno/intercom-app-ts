import type {
  WssDownstream,
  WssPayloads,
  WssUpstream,
} from "../../shared/protocols/index.js";

export interface PanelWssHandlers {
  onOpen: () => void;
  onClose: () => void;
  onError: () => void;
  onMessage: PanelWssMessageHandler;
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
}
