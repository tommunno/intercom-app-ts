//Debugging:
//Set to true and run tail -f dev_matrix_view.txt in terminal to see a live updating view of crosspoints
export const ENABLE_DEV_MATRIX_VIEW = true;

//Global:
export const APP_NAME = "WebCom";

//Web Server:
export const DEFAULT_HTTP_PORT = 4321;
export const DEFAULT_HTTPS_PORT = 4322;
export const CERT_DIR = "certs";
export const KEY_FILE = "server.key";
export const CERT_FILE = "server.cert";
export const GENERATED_KEY_FILE = "generated-server.key";
export const GENERATED_CERT_FILE = "generated-server.cert";
export const WEB_SERVER_DIR = "public";

//AccountManager:
export const MAX_NUM_USERS = 64;
export const DEFAULT_NUM_USERS = 16;
export const SESSION_DURATION_MS = 604_800_000; //7 * 24 * 60 * 60 * 1000 = 7 days
export const SESSION_CLEANUP_INTERVAL_MS = 900_000; //15 * 60 * 1000 = 15 mins
export const ACCOUNT_HEARTBEAT_DURATION_MS = 5000;
export const ACCOUNT_STALE_HEARTBEAT_MS = 10000;

//BCrypt:
export const SALT_ROUNDS = 10;

//Audio:
export const MAX_NUM_SOUNDCARD_CHANNELS = 64;
export const DEFAULT_NUM_SOUNDCARD_CHANNELS = 16;
export const MAX_NUM_PARTYLINES = 64;
export const DEFAULT_NUM_PARTYLINES = 16;
export const CHUNK_SIZE = 480;
export const SHORT_TAIL_TIME_MS = 500;

//WebRtc:
export const WEB_RTC_DISCONNECT_TIMEOUT_MS = 5000;

//TurnServer:
export const DEFAULT_TURN_SERVER_PORT = 4321;
export const DEFAULT_TURN_SERVER_IP = "127.0.0.1";
