import type { AudioInfo } from "../../../shared/types/index.js";

export interface IAudioController {
  init(): void;
  start(): void;
  connectUser(userId: number, clientId: string): boolean;
  disconnectUser(userId: number): boolean;
  getAudioInfo(userId: number): AudioInfo | null;
}
