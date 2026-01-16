import type { MaybePromise } from "../types/MaybePromise.js";

export const WSS_TYPES = {
  USER_LOGIN: "USER_LOGIN",
  ADMIN_LOGIN: "ADMIN_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
} as const;

export const WSS_PAYLOAD_VALIDATORS: WssPayloadValidators = {
  [WSS_TYPES.USER_LOGIN]: dataIsWssUserLogin,
  [WSS_TYPES.ADMIN_LOGIN]: dataIsWssAdminLogin,
  [WSS_TYPES.USER_LOGOUT]: dataIsWssUserLogout,
};

export type WssType = (typeof WSS_TYPES)[keyof typeof WSS_TYPES];

type PayloadMap = {
  [WSS_TYPES.USER_LOGIN]: { myNumber: number };
  [WSS_TYPES.ADMIN_LOGIN]: { myString: string };
  [WSS_TYPES.USER_LOGOUT]: { myBoolean: boolean };
};

export type WssPayloads = {
  [K in WssType]: PayloadMap[K];
};

export type WssCommandMap = {
  [K in WssType]: (
    data: WssPayloads[K],
    clientId: string,
    sessionToken: string | null
  ) => MaybePromise<void>;
};

type WssPayloadValidators = {
  [K in WssType]: (data: Record<string, unknown>) => data is WssPayloads[K];
};

export function dataIsWssUserLogin(
  data: Record<string, unknown>
): data is WssPayloads[typeof WSS_TYPES.USER_LOGIN] {
  return true;
}

export function dataIsWssAdminLogin(
  data: Record<string, unknown>
): data is WssPayloads[typeof WSS_TYPES.ADMIN_LOGIN] {
  return false;
}

export function dataIsWssUserLogout(
  data: Record<string, unknown>
): data is WssPayloads[typeof WSS_TYPES.USER_LOGOUT] {
  return false;
}
