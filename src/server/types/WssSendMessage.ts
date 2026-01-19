import type {
  WssDownstream,
  WssPayloads,
} from "../../shared/protocols/index.js";

export type WssSendMessage = <K extends WssDownstream>(
  type: K,
  payload: WssPayloads[K],
  clientIds: string[],
) => void;
