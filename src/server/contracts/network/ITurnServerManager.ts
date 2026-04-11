import type {
  Ipv4Interfaces,
  ManagerStatus,
  TurnServerCredentials,
} from "../../../shared/types/index.js";
import type { TurnServerResolvedData } from "../../types/index.js";

export interface TurnServerAdminInfo {
  turnServerPort: number | null;
  isTurnServerOnline: boolean;
  ipv4Interfaces: Ipv4Interfaces;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty interface here for future handlers
export interface TurnServerHandlers {}

export interface ITurnServerManager {
  init: () => TurnServerCredentials;
  start: () => void;
  setHandlers: (handlers: TurnServerHandlers) => void;
  populate: (data: TurnServerResolvedData) => string;
  createClientCredentials: () => TurnServerCredentials | null;
  getAdminInfo: () => TurnServerAdminInfo;
  status: ManagerStatus;
  port: number | null;
}
