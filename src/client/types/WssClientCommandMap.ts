import type {
  WssDownstream,
  WssPayloads,
} from "../../shared/protocols/index.js";

export type WssClientCommandMap = {
  [K in WssDownstream]: (data: WssPayloads[K]) => void;
};
