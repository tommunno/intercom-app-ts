import type { CrosspointChange } from "../../types/index.js";

export interface OutputPortState extends OutputPortConfig {
  currentState: Set<number>; //Set of src indexes currently routed to this output port
  newState: Set<number>; //Set of src indexes that should be routed to this output port
}

export interface OutputPortConfig {
  id: number;
  type: "WEB_RTC" | "SOUNDCARD";
  pointToPointListens: Set<number>; //Set of src indexes that are talking point-to-point to this output port
  plListens: Set<number>; //Set of partyline indexes that are talking to this output port
}

export interface IOutputPort {
  id: number;
  state: OutputPortState;
  update: () => CrosspointChange[];
  updateForPlTalkAdd: (plNum: number, portNum: number) => CrosspointChange[];
  updateForPlTalkRemove: (plNum: number, portNum: number) => CrosspointChange[];
  updateForPlListenAdd: (plNum: number) => CrosspointChange[];
  updateForPlListenRemove: (plNum: number) => CrosspointChange[];
}
