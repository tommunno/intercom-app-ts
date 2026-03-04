import type { WssPayloads, WssUpstream } from "../../shared/protocols/index.js";
import type { SessionTokens } from "./SessionTokens.js";

export interface WssMessageInfo<K extends WssUpstream> {
  type: K;
  payload: WssPayloads[K];
  clientId: string;
  sessionTokens: SessionTokens;
}
