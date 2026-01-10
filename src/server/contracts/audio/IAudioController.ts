import type { AuthResult } from "../../../shared/types/index.js";

export interface IAudioController {
  start(): void;
  init(): void;
  connectUser(authResult: AuthResult): void;
}
