import type { SharedRtcIceServer } from "../types/index.js";

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 24;
export const MAX_USERNAME_LENGTH = 8;
export const ICE_SERVERS: SharedRtcIceServer[] = [
  {
    urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
  },
];
