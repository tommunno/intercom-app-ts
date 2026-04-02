import type {
  WssDownstreamSetup,
  WssPayloads,
} from "../../../shared/protocols/index.js";

export type WssSetupCommandMap = {
  [K in WssDownstreamSetup]: (data: WssPayloads[K]) => void;
};
