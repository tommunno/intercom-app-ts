import type { TurnServerCredentials } from "./index.js";

export interface TurnServerInfo {
  port: number;
  credentials: TurnServerCredentials;
}
