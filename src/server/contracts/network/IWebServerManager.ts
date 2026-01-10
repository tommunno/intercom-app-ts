import { TypedEmitter } from "tiny-typed-emitter";

export const WebServerEvent = {
  UserLoginRequest: "UserLoginRequest",
  AdminLoginRequest: "AdminLoginRequest",
} as const;

export interface WebServerEvents {
  [WebServerEvent.UserLoginRequest]: (sessionToken: string) => boolean;
  [WebServerEvent.AdminLoginRequest]: (sessionToken: string) => string;
}

export interface IWebServerManager extends TypedEmitter<WebServerEvents> {
  init(): void;
  start(): void;
}
