import { dataIsObject, dataIsTypeAOrB } from "../../shared/helpers.js";

export interface NetworkData {
  turnServerIp?: string;
}

export interface NetworkPopulateData {
  webServerData: WebServerData;
  turnServerData: TurnServerData;
}

export interface WebServerData {
  httpPort?: number;
  httpsPort?: number;
}

export interface TurnServerData {
  port?: number;
  ip?: string;
}

export interface NetworkResolvedData {
  webServerResolvedData: WebServerResolvedData;
  turnServerResolvedData: TurnServerResolvedData | null;
}

export interface WebServerResolvedData {
  httpPort: number;
  httpsPort: number | null;
}

export interface TurnServerResolvedData {
  port: number;
  ip?: string;
}

export function dataIsNetworkData(data: unknown): data is NetworkData {
  return (
    dataIsObject(data) &&
    dataIsTypeAOrB("string", "undefined", data.turnServerIp)
  );
}
