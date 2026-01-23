import type { PartylineState } from "../../entities/index.js";

export interface IPartyline {
  getState: () => PartylineState;
  isPortTalking: (userId: number) => boolean;
  isPortListening: (userId: number) => boolean;
}
