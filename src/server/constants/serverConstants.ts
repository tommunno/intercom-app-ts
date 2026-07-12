//Set to true and run tail -f dev_matrix_view.txt in terminal to see a live updating view of crosspoints
export const ENABLE_DEV_MATRIX_VIEW = false;

//Web Server:
export const DEFAULT_HTTP_PORT = 4321;
export const DEFAULT_HTTPS_PORT = 4322;
export const CERT_DIR = "certs";
export const KEY_FILE = "server.key";
export const CERT_FILE = "server.cert";
export const GENERATED_KEY_FILE = "generated-server.key";
export const GENERATED_CERT_FILE = "generated-server.cert";
export const WEB_SERVER_DIR = "public";

//Database:
export const DATABASE_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const MAX_DATABASE_BACKUPS = 7;

//AccountManager:
export const SESSION_DURATION_MS = 604_800_000; //7 * 24 * 60 * 60 * 1000 = 7 days
export const SESSION_CLEANUP_INTERVAL_MS = 900_000; //15 * 60 * 1000 = 15 mins
export const ACCOUNT_HEARTBEAT_DURATION_MS = 5000;
export const ACCOUNT_STALE_HEARTBEAT_MS = 10000;

//AdminAccountManager:
export const DEFAULT_ADMIN_USERNAME = "admin";
export const DEFAULT_ADMIN_PASSWORD = "intercomadmin123";

//BCrypt:
export const SALT_ROUNDS = 10;

//Audio:
export const CHUNK_SIZE = 480;
export const SHORT_TAIL_TIME_MS = 500;
export const AUDIO_LOSS_DETECTION_TIME_MS = 4000;

//WebRtc:
export const WEB_RTC_DISCONNECT_TIMEOUT_MS = 5000;

//TurnServer:
export const DEFAULT_TURN_SERVER_PORT = 3478;
export const DEFAULT_TURN_SERVER_IP = "127.0.0.1";

//Logs:
export const MAX_LOG_ROWS = 10_000;
export const MAX_LOG_EXPORT_ROWS = 10_000; //Max number of rows exported as a text file for an admin to download
export const LOGS_BETWEEN_PRUNES = 500;
export const ADMIN_LOG_UPDATE_INTERVAL_MS = 500;
export const CONSOLE_LOGGING_ENABLED = false;
