export interface WebServerHandlers {
  onUserLoginRequest: (sessionToken: string) => boolean;
  onAdminLoginRequest: (sessionToken: string) => string;
}

export interface IWebServerManager {
  init(): void;
  start(): void;
  setHandlers(handlers: WebServerHandlers): void;
}
