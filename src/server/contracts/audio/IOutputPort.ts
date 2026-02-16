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
  plListens: ReadonlySet<number>;
  state: OutputPortState;
  update: (allPlTalkers: ReadonlySet<number>) => CrosspointChange[];
  updateForPlTalkAdd: (plNum: number, portNum: number) => CrosspointChange[];
  updateForPlTalkRemove: (
    plNum: number,
    portNum: number,
    allPlTalkers: ReadonlySet<number>,
  ) => CrosspointChange[];
  updateForPlListenAdd: (
    plNum: number,
    plTalkers: ReadonlySet<number>,
  ) => CrosspointChange[];
  updateForPlListenRemove: (
    plNum: number,
    allPlTalkers: ReadonlySet<number>,
  ) => CrosspointChange[];
}
