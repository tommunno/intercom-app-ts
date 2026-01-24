import type { SuccessMessage } from "../../../shared/types/index.js";
import type { PartylineState } from "../../entities/index.js";

export interface IPartyline {
  id: number;
  state: PartylineState;
  isUserTalking: (userId: number) => boolean;
  isUserListening: (userId: number) => boolean;
  setUserTalking: (userId: number, state: boolean) => SuccessMessage;
  setUserListening: (userId: number, state: boolean) => SuccessMessage;
}
