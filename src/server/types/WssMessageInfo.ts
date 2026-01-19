import type { WssPayloads, WssUpstream } from "../../shared/protocols/index.js";

export interface WssMessageInfo<K extends WssUpstream> {
  type: K;
  payload: WssPayloads[K];
  clientId: string;
  sessionToken: string | null;
}
