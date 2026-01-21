import type { WssPayloads, WssUpstream } from "../../shared/protocols/index.js";
import type { MaybePromise } from "../../shared/types/index.js";

export type WssCommandMap = {
  [K in WssUpstream]: (
    data: WssPayloads[K],
    clientId: string,
    sessionToken: string | null,
  ) => MaybePromise<void>;
};
