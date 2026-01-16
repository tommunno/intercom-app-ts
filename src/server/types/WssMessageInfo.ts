import type {
  WssPayloads,
  WssType,
} from "../../shared/protocols/wssProtocol.js";

export interface WssMessageInfo<K extends WssType> {
  type: K;
  payload: WssPayloads[K];
  clientId: string;
  sessionToken: string | null;
}
