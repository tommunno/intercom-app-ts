import type { TurnServerCredentials } from "../../../shared/types/index.js";
import type { TurnServerData } from "../../types/index.js";

export interface TurnServerHandlers {}

export interface ITurnServerManager {
  init: () => TurnServerCredentials;
  start: () => void;
  setHandlers: (handlers: TurnServerHandlers) => void;
  populate: (data: TurnServerData) => string;
  createClientCredentials: () => TurnServerCredentials | null;
  port: number;
}
