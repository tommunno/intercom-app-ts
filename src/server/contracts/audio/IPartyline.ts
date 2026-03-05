import type { SuccessMessage } from "../../../shared/types/index.js";

export interface PartylineState extends PartylineConfig {}

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
  id: number;
  name: string;
  portsTalking: ReadonlySet<number>;
  portsListening: ReadonlySet<number>;
  state: PartylineState;
  isPortTalking: (portNum: number) => boolean;
  isPortListening: (portNum: number) => boolean;
  setPortTalking: (portNum: number, state: boolean) => SuccessMessage;
  setPortListening: (portNum: number, state: boolean) => SuccessMessage;
  getSnapshot: () => PartylineSnapshot;
}
