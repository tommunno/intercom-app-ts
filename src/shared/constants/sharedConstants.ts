import type { SharedRtcIceServer } from "../types/index.js";

//Acount:
export const MAX_NUM_USERS = 64;
export const DEFAULT_NUM_USERS = 16;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 24;
export const MAX_USERNAME_LENGTH = 12;

//WebRTC:
export const ICE_SERVERS: SharedRtcIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
    ],
  },
];

//Audio:
export const MAX_NUM_SOUNDCARD_CHANNELS = 64;
export const DEFAULT_NUM_SOUNDCARD_CHANNELS = 16;
export const MAX_NUM_PARTYLINES = 64;
export const DEFAULT_NUM_PARTYLINES = 16;
export const MAX_PARTYLINE_NAME_LENGTH = 12;

//Logs:
export const LOG_PAGE_SIZE = 25;
