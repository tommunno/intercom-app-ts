import type {
  ManagerStatus,
  TurnServerCredentials,
} from "../../../shared/types/index.js";
import type { TurnServerResolvedData } from "../../types/index.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future handlers
export interface TurnServerHandlers {}

export interface ITurnServerManager {
  init: () => TurnServerCredentials;
  start: () => void;
  setHandlers: (handlers: TurnServerHandlers) => void;
  populate: (data: TurnServerResolvedData) => string;
  createClientCredentials: () => TurnServerCredentials | null;
  status: ManagerStatus;
  port: number;
}
