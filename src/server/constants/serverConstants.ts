//Web Server:
export const HTTP_PORT = 4321;
export const HTTPS_PORT = 4322;
export const CERT_DIR = "certs";
export const KEY_FILE = "server.key";
export const CERT_FILE = "server.cert";
export const WEB_SERVER_DIR = "public";

//Auth:
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 24;
export const MAX_USERNAME_LENGTH = 8;
export const SESSION_DURATION_MS = 604800000; //7 * 24 * 60 * 60 * 1000 = 7 days

//BCrypt:
export const SALT_ROUNDS = 10;
