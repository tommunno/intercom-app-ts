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
