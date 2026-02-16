import type { SuccessMessage } from "../../../shared/types/index.js";

export interface PartylineState extends PartylineConfig {}

export interface PartylineConfig {
  id: number;
  name: string;
  numUsers: number;
  numSoundcardChannels: number;
  portsTalking: Set<number>;
  portsListening: Set<number>;
}

export interface IPartyline {
  id: number;
  state: PartylineState;
  isUserTalking: (userId: number) => boolean;
  isUserListening: (userId: number) => boolean;
  setUserTalking: (userId: number, state: boolean) => SuccessMessage;
  setUserListening: (userId: number, state: boolean) => SuccessMessage;
}
