//Helpers:
import { dataIsArrayOfType, dataIsObject, dataIsType } from "../helpers.js";
//Types:
import {
  dataIsUserInfo,
  type UserInfo,
  dataIsAudioInfo,
  type AudioInfo,
} from "../types/index.js";

//UPSTREAM AND DOWNSTREAM MESSAGE TYPES:

export const WSS_UPSTREAM = {
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
} as const;

export const WSS_DOWNSTREAM = {
  USER_LOGIN_RESPONSE: "USER_LOGIN_RESPONSE",
  USER_TEST_RESPONSE: "USER_TEST_RESPONSE",
} as const;

export type WssUpstream = (typeof WSS_UPSTREAM)[keyof typeof WSS_UPSTREAM];
export type WssDownstream =
  (typeof WSS_DOWNSTREAM)[keyof typeof WSS_DOWNSTREAM];

export type WssType = WssUpstream | WssDownstream;

//PAYLOAD VALIDATION:

export const WSS_PAYLOAD_VALIDATORS = {
  [WSS_UPSTREAM.USER_LOGIN]: dataIsWssUserLogin,
  [WSS_UPSTREAM.USER_LOGOUT]: dataIsWssUserLogout,
  [WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]: dataIsWssUserLoginResponse,
  [WSS_DOWNSTREAM.USER_TEST_RESPONSE]: dataIsWssUserTestResponse,
} satisfies WssPayloadValidators;

type WssPayloadValidators = {
  [K in WssType]: (data: unknown) => data is WssPayloads[K];
};

type PayloadMap = {
  [WSS_UPSTREAM.USER_LOGIN]: null;
  [WSS_UPSTREAM.USER_LOGOUT]: { myLogoutTest: number };
  [WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]: {
    success: boolean;
    message: string;
    userInfo: UserInfo | null;
    audioInfo: AudioInfo | null;
  };
  [WSS_DOWNSTREAM.USER_TEST_RESPONSE]: { myTest2: string[] };
};

export type WssPayloads = {
  [K in WssType]: PayloadMap[K];
};

//PAYLOAD VALIDATOR TYPE GUARDS:

export function payloadIsValidForType<K extends WssType>(
  type: K,
  payload: unknown,
): payload is WssPayloads[K] {
  return WSS_PAYLOAD_VALIDATORS[type](payload);
}

//UPSTREAM:

export function dataIsWssUserLogin(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.USER_LOGIN] {
  return dataIsType("null", data);
}

export function dataIsWssUserLogout(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.USER_LOGOUT] {
  return dataIsObject(data) && dataIsType("number", data.myLogoutTest);
}

export function dataIsWssUserLoginResponse(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM.USER_LOGIN_RESPONSE] {
  return (
    dataIsObject(data) &&
    dataIsType("boolean", data.success) &&
    dataIsType("string", data.message) &&
    (dataIsUserInfo(data.userInfo) || data.userInfo === null) &&
    (dataIsAudioInfo(data.audioInfo) || data.audioInfo === null)
  );
}

//DOWNSTREAM:

export function dataIsWssUserTestResponse(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM.USER_TEST_RESPONSE] {
  return dataIsObject(data) && dataIsArrayOfType("string", data.myTest2);
}
