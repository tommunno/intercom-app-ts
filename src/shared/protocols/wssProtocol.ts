//Helpers:
import { dataIsObject, dataIsType } from "../helpers.js";
import type {
  AdminLoginResponse,
  AdminUpdate,
  AdminUsersChangeRequest,
} from "../types/index.js";
//Types:
import {
  dataIsUserInfo,
  type UserInfo,
  dataIsAudioInfo,
  type AudioInfo,
  dataIsTurnServerInfo,
  type TurnServerInfo,
  dataIsKeyPressInfo,
  type KeyPressInfo,
  dataIsHeartbeatRequestPayload,
  type HeartbeatRequestPayload,
  dataIsRtcIceCandidateInitWire,
  type RtcIceCandidateInitWire,
  dataIsRtcAnswerWire,
  type RtcAnswerWire,
  dataIsRtcOfferWire,
  type RtcOfferWire,
  type AdminSnapshot,
  dataIsAdminSnapshot,
  dataIsAdminLoginResponse,
  dataIsAdminUsersChangeRequest,
  dataIsAdminUpdate,
} from "../types/index.js";

//UPSTREAM AND DOWNSTREAM MESSAGE TYPES:

//For messages being received by the server:
export const WSS_UPSTREAM = {
  HEARTBEAT_RESPONSE: "HEARTBEAT_RESPONSE",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  KEY_PRESS: "KEY_PRESS",
  WEB_RTC_OFFER: "WEB_RTC_OFFER",
  WEB_RTC_CLIENT_ICE_CANDIDATE: "WEB_RTC_CLIENT_ICE_CANDIDATE",
  ADMIN_HEARTBEAT_RESPONSE: "ADMIN_HEARTBEAT_RESPONSE",
  ADMIN_LOGIN: "ADMIN_LOGIN",
  ADMIN_LOGOUT: "ADMIN_LOGOUT",
  ADMIN_USERS_CHANGE_REQUEST: "ADMIN_USERS_CHANGE_REQUEST",
} as const;

//For messages being received by the client talkback panel:
export const WSS_DOWNSTREAM_PANEL = {
  HEARTBEAT_REQUEST: "HEARTBEAT_REQUEST",
  USER_LOGIN_RESPONSE: "USER_LOGIN_RESPONSE",
  USER_FORCE_LOGOUT: "USER_FORCE_LOGOUT",
  USER_AUDIO_INFO_UPDATE: "USER_AUDIO_INFO_UPDATE",
  WEB_RTC_ANSWER: "WEB_RTC_ANSWER",
  WEB_RTC_SERVER_ICE_CANDIDATE: "WEB_RTC_SERVER_ICE_CANDIDATE",
} as const;

//For messages being received by the client setup admin page:
export const WSS_DOWNSTREAM_SETUP = {
  ADMIN_HEARTBEAT_REQUEST: "ADMIN_HEARTBEAT_REQUEST",
  ADMIN_LOGIN_RESPONSE: "ADMIN_LOGIN_RESPONSE",
  ADMIN_FORCE_LOGOUT: "ADMIN_FORCE_LOGOUT",
  ADMIN_UPDATE: "ADMIN_UPDATE",
} as const;

export type WssUpstream = (typeof WSS_UPSTREAM)[keyof typeof WSS_UPSTREAM];
export type WssDownstreamPanel =
  (typeof WSS_DOWNSTREAM_PANEL)[keyof typeof WSS_DOWNSTREAM_PANEL];
export type WssDownstreamSetup =
  (typeof WSS_DOWNSTREAM_SETUP)[keyof typeof WSS_DOWNSTREAM_SETUP];

export type WssDownstream = WssDownstreamPanel | WssDownstreamSetup;
export type WssType = WssUpstream | WssDownstream;

//PAYLOAD VALIDATION:

export const WSS_PAYLOAD_VALIDATORS = {
  [WSS_UPSTREAM.HEARTBEAT_RESPONSE]: dataIsWssHeartbeatResponse,
  [WSS_UPSTREAM.USER_LOGIN]: dataIsWssUserLogin,
  [WSS_UPSTREAM.USER_LOGOUT]: dataIsWssUserLogout,
  [WSS_UPSTREAM.KEY_PRESS]: dataIsWssKeyPress,
  [WSS_UPSTREAM.WEB_RTC_OFFER]: dataIsWebRtcOffer,
  [WSS_UPSTREAM.WEB_RTC_CLIENT_ICE_CANDIDATE]: dataIsWebRtcClientIceCandidate,
  [WSS_UPSTREAM.ADMIN_HEARTBEAT_RESPONSE]: dataIsWssAdminHeartbeatResponse,
  [WSS_UPSTREAM.ADMIN_LOGIN]: dataIsWssAdminLogin,
  [WSS_UPSTREAM.ADMIN_LOGOUT]: dataIsWssAdminLogout,
  [WSS_UPSTREAM.ADMIN_USERS_CHANGE_REQUEST]: dataIsWssAdminUsersChangeRequest,
  [WSS_DOWNSTREAM_PANEL.HEARTBEAT_REQUEST]: dataIsWssHeartbeatRequest,
  [WSS_DOWNSTREAM_PANEL.USER_LOGIN_RESPONSE]: dataIsWssUserLoginResponse,
  [WSS_DOWNSTREAM_PANEL.USER_FORCE_LOGOUT]: dataIsWssUserForceLogout,
  [WSS_DOWNSTREAM_PANEL.USER_AUDIO_INFO_UPDATE]: dataIsWssUserAudioInfoUpdate,
  [WSS_DOWNSTREAM_PANEL.WEB_RTC_ANSWER]: dataIsWebRtcAnswer,
  [WSS_DOWNSTREAM_PANEL.WEB_RTC_SERVER_ICE_CANDIDATE]:
    dataIsWebRtcServerIceCandidate,
  [WSS_DOWNSTREAM_SETUP.ADMIN_HEARTBEAT_REQUEST]:
    dataIsWssAdminHeartbeatRequest,
  [WSS_DOWNSTREAM_SETUP.ADMIN_LOGIN_RESPONSE]: dataIsWssAdminLoginResponse,
  [WSS_DOWNSTREAM_SETUP.ADMIN_FORCE_LOGOUT]: dataIsWssAdminForceLogout,
  [WSS_DOWNSTREAM_SETUP.ADMIN_UPDATE]: dataIsWssAdminUpdate,
} satisfies WssPayloadValidators;

type WssPayloadValidators = {
  [K in WssType]: (data: unknown) => data is WssPayloads[K];
};

type PayloadMap = {
  [WSS_UPSTREAM.HEARTBEAT_RESPONSE]: { timestamp: number };
  [WSS_UPSTREAM.USER_LOGIN]: null;
  [WSS_UPSTREAM.USER_LOGOUT]: null;
  [WSS_UPSTREAM.KEY_PRESS]: KeyPressInfo;
  [WSS_UPSTREAM.WEB_RTC_OFFER]: RtcOfferWire;
  [WSS_UPSTREAM.WEB_RTC_CLIENT_ICE_CANDIDATE]: RtcIceCandidateInitWire | null;
  [WSS_UPSTREAM.ADMIN_HEARTBEAT_RESPONSE]: { timestamp: number };
  [WSS_UPSTREAM.ADMIN_LOGIN]: null;
  [WSS_UPSTREAM.ADMIN_LOGOUT]: null;
  [WSS_UPSTREAM.ADMIN_USERS_CHANGE_REQUEST]: AdminUsersChangeRequest;
  [WSS_DOWNSTREAM_PANEL.HEARTBEAT_REQUEST]: HeartbeatRequestPayload;
  [WSS_DOWNSTREAM_PANEL.USER_LOGIN_RESPONSE]: {
    success: boolean;
    message: string;
    userInfo: UserInfo | null;
    audioInfo: AudioInfo | null;
    turnServerInfo: TurnServerInfo | null;
  };
  [WSS_DOWNSTREAM_PANEL.USER_FORCE_LOGOUT]: {
    loginTakeover: boolean;
  };
  [WSS_DOWNSTREAM_PANEL.USER_AUDIO_INFO_UPDATE]: AudioInfo;
  [WSS_DOWNSTREAM_PANEL.WEB_RTC_ANSWER]: RtcAnswerWire;
  [WSS_DOWNSTREAM_PANEL.WEB_RTC_SERVER_ICE_CANDIDATE]: RtcIceCandidateInitWire | null;
  [WSS_DOWNSTREAM_SETUP.ADMIN_HEARTBEAT_REQUEST]: HeartbeatRequestPayload;
  [WSS_DOWNSTREAM_SETUP.ADMIN_LOGIN_RESPONSE]: AdminLoginResponse;
  [WSS_DOWNSTREAM_SETUP.ADMIN_FORCE_LOGOUT]: null;
  [WSS_DOWNSTREAM_SETUP.ADMIN_UPDATE]: AdminUpdate;
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

export function dataIsWssHeartbeatResponse(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.HEARTBEAT_RESPONSE] {
  return dataIsObject(data) && dataIsType("number", data.timestamp);
}

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

export function dataIsWebRtcOffer(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.WEB_RTC_OFFER] {
  return dataIsRtcOfferWire(data);
}

export function dataIsWebRtcClientIceCandidate(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.WEB_RTC_CLIENT_ICE_CANDIDATE] {
  return dataIsRtcIceCandidateInitWire(data) || dataIsType("null", data);
}

export function dataIsWssAdminHeartbeatResponse(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.ADMIN_HEARTBEAT_RESPONSE] {
  return dataIsObject(data) && dataIsType("number", data.timestamp);
}

export function dataIsWssAdminLogin(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.ADMIN_LOGIN] {
  return dataIsType("null", data);
}

export function dataIsWssAdminLogout(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.ADMIN_LOGOUT] {
  return dataIsType("null", data);
}

export function dataIsWssAdminUsersChangeRequest(
  data: unknown,
): data is WssPayloads[typeof WSS_UPSTREAM.ADMIN_USERS_CHANGE_REQUEST] {
  return dataIsAdminUsersChangeRequest(data);
}

//DOWNSTREAM PANEL:

export function dataIsWssHeartbeatRequest(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_PANEL.HEARTBEAT_REQUEST] {
  return dataIsHeartbeatRequestPayload(data);
}

export function dataIsWssUserLoginResponse(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_PANEL.USER_LOGIN_RESPONSE] {
  return (
    dataIsObject(data) &&
    dataIsType("boolean", data.success) &&
    dataIsType("string", data.message) &&
    (dataIsUserInfo(data.userInfo) || data.userInfo === null) &&
    (dataIsAudioInfo(data.audioInfo) || data.audioInfo === null) &&
    (dataIsTurnServerInfo(data.turnServerInfo) || data.turnServerInfo === null)
  );
}

export function dataIsWssUserForceLogout(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_PANEL.USER_FORCE_LOGOUT] {
  return dataIsObject(data) && dataIsType("boolean", data.loginTakeover);
}

export function dataIsWssUserAudioInfoUpdate(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_PANEL.USER_AUDIO_INFO_UPDATE] {
  return dataIsAudioInfo(data);
}

export function dataIsWebRtcAnswer(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_PANEL.WEB_RTC_ANSWER] {
  return dataIsRtcAnswerWire(data);
}

export function dataIsWebRtcServerIceCandidate(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_PANEL.WEB_RTC_SERVER_ICE_CANDIDATE] {
  return dataIsRtcIceCandidateInitWire(data) || dataIsType("null", data);
}

//DOWNSTREAM SETUP PAGE:

export function dataIsWssAdminHeartbeatRequest(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_SETUP.ADMIN_HEARTBEAT_REQUEST] {
  return dataIsHeartbeatRequestPayload(data);
}

export function dataIsWssAdminLoginResponse(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_SETUP.ADMIN_LOGIN_RESPONSE] {
  return dataIsAdminLoginResponse(data);
}

export function dataIsWssAdminForceLogout(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_SETUP.ADMIN_FORCE_LOGOUT] {
  return dataIsType("null", data);
}

export function dataIsWssAdminUpdate(
  data: unknown,
): data is WssPayloads[typeof WSS_DOWNSTREAM_SETUP.ADMIN_UPDATE] {
  return dataIsAdminUpdate(data);
}
