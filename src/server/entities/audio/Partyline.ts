import type { IPartyline } from "../../contracts/index.js";

export type PartylineState = {
  id: number;
  name: string;
  portsTalking: Set<number>;
  portsListening: Set<number>;
};

export class Partyline implements IPartyline {
  private state: PartylineState;

  constructor(init: PartylineState) {
    this.state = {
      id: init.id,
      name: init.name,
      portsTalking: new Set(init.portsTalking),
      portsListening: new Set(init.portsListening),
    };
  }

  getState(): PartylineState {
    return {
      ...this.state,
      portsTalking: new Set(this.state.portsTalking),
      portsListening: new Set(this.state.portsListening),
    };
  }

  isPortTalking(userId: number): boolean {
    return this.state.portsTalking.has(userId);
  }

  isPortListening(userId: number): boolean {
    return this.state.portsListening.has(userId);
  }
}
