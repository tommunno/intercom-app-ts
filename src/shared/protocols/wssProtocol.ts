import type { MaybePromise } from "../types/MaybePromise.js";

export const WSS_TYPES = {
  USER_LOGIN: "USER_LOGIN",
} as const;

export const WSS_PAYLOAD_VALIDATORS: WssPayloadValidators = {
  [WSS_TYPES.USER_LOGIN]: dataIsWssUserLogin,
};

export type WssType = (typeof WSS_TYPES)[keyof typeof WSS_TYPES];

type PayloadMap = {
  [WSS_TYPES.USER_LOGIN]: {};
};

export type WssPayloads = {
  [K in WssType]: PayloadMap[K];
};

export type WssCommandMap = {
  [K in WssType]: (
    data: WssPayloads[K],
    clientId: string,
    sessionToken: string | null,
  ) => MaybePromise<void>;
};

type WssPayloadValidators = {
  [K in WssType]: (data: Record<string, unknown>) => data is WssPayloads[K];
};

export function dataIsWssUserLogin(
  data: Record<string, unknown>,
): data is WssPayloads[typeof WSS_TYPES.USER_LOGIN] {
  return data !== null && typeof data === "object";
}
