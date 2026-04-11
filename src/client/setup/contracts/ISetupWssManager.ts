import type {
  WssDownstreamSetup,
  WssPayloads,
  WssUpstream,
} from "../../../shared/protocols/wssProtocol.js";

export interface SetupWssHandlers {
  onOpen: () => void;
  onClose: () => void;
  onError: () => void;
  onServerRestored: () => void;
}

export interface ISetupWssManager {
  setHandlers: (handlers: SetupWssHandlers | null) => void;
  connect: () => void;
  disconnect: () => void;
  send: <T extends WssUpstream>(type: T, payload: WssPayloads[T]) => void;
  subscribe: <T extends WssDownstreamSetup>(
    type: T,
    listener: (payload: WssPayloads[T]) => void,
  ) => () => void;
}
