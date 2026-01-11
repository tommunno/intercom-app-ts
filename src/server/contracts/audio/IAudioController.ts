import type { AuthResult } from "../../../shared/types/index.js";

export interface IAudioController {
  start(): void;
  init(): void;
  connectUser(userId: number, clientId: string): void;
  disconnectUser(userId: number): void;
}
