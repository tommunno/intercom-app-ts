import type { TurnServerCredentials } from "../../../shared/types/index.js";

export interface TurnServerHandlers {}

export interface ITurnServerManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: TurnServerHandlers) => void;
  setPortAndIp: (port: number, ip: string) => string;
  createServerCredentials: () => TurnServerCredentials;
  createClientCredentials: () => TurnServerCredentials | null;
  url: string;
  port: number;
}
