//Web Server:
export const HTTP_PORT = 4321;
export const HTTPS_PORT = 4322;
export const CERT_DIR = "certs";
export const KEY_FILE = "server.key";
export const CERT_FILE = "server.cert";
export const WEB_SERVER_DIR = "public";

//Auth:
export const SESSION_DURATION_MS = 604800000; //7 * 24 * 60 * 60 * 1000 = 7 days
export const ACCOUNT_HEARTBEAT_DURATION_MS = 10000;
export const ACCOUNT_STALE_HEARTBEAT_MS = 20000;

//BCrypt:
export const SALT_ROUNDS = 10;

//Audio Matrix:
export const MAX_NUM_USERS = 64;
export const MAX_NUM_SOUNDCARD_CHANNELS = 64;
export const MAX_NUM_PARTYLINES = 64;
