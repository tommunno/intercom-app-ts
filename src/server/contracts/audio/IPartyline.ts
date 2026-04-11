import type { SuccessMessage } from "../../../shared/types/index.js";

//This can be added to in the future if required
export type PartylineState = PartylineConfig;

export interface PartylineConfig {
  id: number;
  name: string;
  numPorts: number;
  portsTalking: Set<number>;
  portsListening: Set<number>;
}

export interface PartylineSnapshot {
  name: string;
  portsTalking: ReadonlySet<number>;
  portsListening: ReadonlySet<number>;
}

export interface IPartyline {
  readonly id: number;
  name: string;
  readonly portsTalking: ReadonlySet<number>;
  readonly portsListening: ReadonlySet<number>;
  readonly state: PartylineState;
  isPortTalking: (portNum: number) => boolean;
  isPortListening: (portNum: number) => boolean;
  setPortTalking: (portNum: number, state: boolean) => SuccessMessage;
  setPortListening: (portNum: number, state: boolean) => SuccessMessage;
  getSnapshot: () => PartylineSnapshot;
}
