import type { MaybePromise } from "../types/MaybePromise.js";

export const WSS_UPSTREAM = {
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
} as const;

export const WSS_DOWNSTREAM = {
  USER_LOGIN_RESPONSE: "USER_LOGIN_RESPONSE",
  USER_TEST_RESPONSE: "USER_TEST_RESPONSE",
} as const;

export const WSS_PAYLOAD_VALIDATORS = {
  [WSS_UPSTREAM.USER_LOGIN]: dataIsWssUserLogin,
  [WSS_UPSTREAM.USER_LOGOUT]: dataIsWssUserLogout,
  [WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]: dataIsWssUserLoginResponse,
  [WSS_DOWNSTREAM.USER_TEST_RESPONSE]: dataIsWssUserTestResponse,
} satisfies WssPayloadValidators;

export type WssUpstream = (typeof WSS_UPSTREAM)[keyof typeof WSS_UPSTREAM];
export type WssDownstream =
  (typeof WSS_DOWNSTREAM)[keyof typeof WSS_DOWNSTREAM];

export type WssType = WssUpstream | WssDownstream;

type PayloadMap = {
  [WSS_UPSTREAM.USER_LOGIN]: { cow: 2 };
  [WSS_UPSTREAM.USER_LOGOUT]: { myLogoutTest: number };
  [WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]: { myTest: string };
  [WSS_DOWNSTREAM.USER_TEST_RESPONSE]: { myTest2: string[] };
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
  [K in WssType]: (data: unknown) => data is WssPayloads[K];
};

export function payloadIsValidForType<K extends WssType>(
  type: K,
  payload: unknown,
): payload is WssPayloads[K] {
  return WSS_PAYLOAD_VALIDATORS[type](payload);
}

//Still need to add in validation here
export function dataIsWssUserLogin(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.USER_LOGIN] {
  return data !== null && typeof data === "object";
}

//Still need to add in validation here
export function dataIsWssUserLogout(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.USER_LOGOUT] {
  return data !== null && typeof data === "object";
}

//Still need to add in validation here
export function dataIsWssUserLoginResponse(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM.USER_LOGIN_RESPONSE] {
  return data !== null && typeof data === "object";
}

//Still need to add in validation here
export function dataIsWssUserTestResponse(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM.USER_TEST_RESPONSE] {
  return data !== null && typeof data === "object";
}
