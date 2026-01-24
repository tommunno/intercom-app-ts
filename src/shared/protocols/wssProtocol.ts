//Helpers:
import type { KeyType } from "../types/KeyType.js";
import { dataIsObject, dataIsType } from "../helpers.js";
//Types:
import {
  dataIsUserInfo,
  type UserInfo,
  dataIsAudioInfo,
  type AudioInfo,
  type KeyState,
  dataIsKeyType,
  dataIsKeyState,
} from "../types/index.js";
import {
  dataIsKeyPressInfo,
  type KeyPressInfo,
} from "../../server/types/KeyPressInfo.js";

//UPSTREAM AND DOWNSTREAM MESSAGE TYPES:

export const WSS_UPSTREAM = {
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  KEY_PRESS: "KEY_PRESS",
} as const;

export const WSS_DOWNSTREAM = {
  USER_LOGIN_RESPONSE: "USER_LOGIN_RESPONSE",
  USER_FORCE_LOGOUT: "USER_FORCE_LOGOUT",
  USER_AUDIO_INFO_UPDATE: "USER_AUDIO_INFO_UPDATE",
} as const;

export type WssUpstream = (typeof WSS_UPSTREAM)[keyof typeof WSS_UPSTREAM];
export type WssDownstream =
  (typeof WSS_DOWNSTREAM)[keyof typeof WSS_DOWNSTREAM];

export type WssType = WssUpstream | WssDownstream;

//PAYLOAD VALIDATION:

export const WSS_PAYLOAD_VALIDATORS = {
  [WSS_UPSTREAM.USER_LOGIN]: dataIsWssUserLogin,
  [WSS_UPSTREAM.USER_LOGOUT]: dataIsWssUserLogout,
  [WSS_UPSTREAM.KEY_PRESS]: dataIsWssKeyPress,
  [WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]: dataIsWssUserLoginResponse,
  [WSS_DOWNSTREAM.USER_FORCE_LOGOUT]: dataIsWssUserForceLogout,
  [WSS_DOWNSTREAM.USER_AUDIO_INFO_UPDATE]: dataIsWssUserAudioInfoUpdate,
} satisfies WssPayloadValidators;

type WssPayloadValidators = {
  [K in WssType]: (data: unknown) => data is WssPayloads[K];
};

type PayloadMap = {
  [WSS_UPSTREAM.USER_LOGIN]: null;
  [WSS_UPSTREAM.USER_LOGOUT]: null;
  [WSS_UPSTREAM.KEY_PRESS]: KeyPressInfo;
  [WSS_DOWNSTREAM.USER_LOGIN_RESPONSE]: {
    success: boolean;
    message: string;
    userInfo: UserInfo | null;
    audioInfo: AudioInfo | null;
  };
  [WSS_DOWNSTREAM.USER_FORCE_LOGOUT]: {
    loginTakeover: boolean;
  };
  [WSS_DOWNSTREAM.USER_AUDIO_INFO_UPDATE]: AudioInfo;
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
  return dataIsType("null", data);
}

export function dataIsWssKeyPress(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.KEY_PRESS] {
  return dataIsKeyPressInfo(data);
}

//DOWNSTREAM:

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

export function dataIsWssUserForceLogout(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM.USER_FORCE_LOGOUT] {
  return dataIsObject(data) && dataIsType("boolean", data.loginTakeover);
}

export function dataIsWssUserAudioInfoUpdate(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM.USER_AUDIO_INFO_UPDATE] {
  return dataIsAudioInfo(data);
}
