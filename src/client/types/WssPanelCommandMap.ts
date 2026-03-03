import type {
  WssDownstreamPanel,
  WssPayloads,
} from "../../shared/protocols/index.js";

export type WssPanelCommandMap = {
  [K in WssDownstreamPanel]: (data: WssPayloads[K]) => void;
};
