export interface NetworkData {
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
