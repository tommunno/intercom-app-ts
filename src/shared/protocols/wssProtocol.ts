import type { MaybePromise } from "../types/MaybePromise.js";

export const WSS_UPSTREAM = {
  USER_LOGIN: "USER_LOGIN",
} as const;

export const WSS_DOWNSTREAM = {
  USER_LOGIN_RESPONSE: "USER_LOGIN_RESPONSE",
} as const;

export const WSS_PAYLOAD_VALIDATORS = {
  [WSS_UPSTREAM.USER_LOGIN]: dataIsWssUserLogin,
  [WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]: dataIsWssUserLoginResponse,
} satisfies WssPayloadValidators;

export type WssUpstream = (typeof WSS_UPSTREAM)[keyof typeof WSS_UPSTREAM];
export type WssDownstream =
  (typeof WSS_DOWNSTREAM)[keyof typeof WSS_DOWNSTREAM];

export type WssType = WssUpstream | WssDownstream;

type PayloadMap = {
  [WSS_UPSTREAM.USER_LOGIN]: Record<string, unknown>;
  [WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]: { myTest: string };
};

export type WssPayloads = {
  [K in WssType]: PayloadMap[K];
};

export type WssCommandMap = {
  [K in WssUpstream]: (
    data: WssPayloads[K],
    clientId: string,
    sessionToken: string | null,
  ) => MaybePromise<void>;
};

export type WssClientCommandMap = {
  [K in WssDownstream]: (data: WssPayloads[K]) => void;
};

type WssPayloadValidators = {
  [K in WssType]: (data: Record<string, unknown>) => data is WssPayloads[K];
};

export function dataIsWssUserLogin(
  data: Record<string, unknown>,
): data is WssPayloads[typeof WSS_UPSTREAM.USER_LOGIN] {
  return data !== null && typeof data === "object";
}

//Still need to add in validation here
export function dataIsWssUserLoginResponse(
  data: Record<string, unknown>,
): data is WssPayloads[typeof WSS_DOWNSTREAM.USER_LOGIN_RESPONSE] {
  return data !== null && typeof data === "object";
}
