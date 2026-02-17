import type {
  ILogger,
  IOutputPort,
  OutputPortConfig,
  OutputPortState,
} from "../../contracts/index.js";
import type { CrosspointChange } from "../../types/index.js";

export class OutputPort implements IOutputPort {
  private _state: OutputPortState;
  constructor(
    config: OutputPortConfig,
    private getPlTalks: (plNum: number) => ReadonlySet<number> | null,
    private logger: ILogger,
  ) {
    this._state = {
      id: config.id,
      type: config.type,
      pointToPointListens: new Set(config.pointToPointListens),
      plListens: new Set(config.plListens),
      currentState: new Set(),
      newState: new Set(),
    };
    this.logger = this.logger.child({
      context: `OutputPort ${this._state.id}`,
    });
  }

  update(): CrosspointChange[] {
    const allPlTalkers = this.getAllPlTalkers();
    if (!allPlTalkers) return [];

    const { id, pointToPointListens } = this._state;

    const next = new Set<number>(pointToPointListens);
    //Don't add ourselves:
    for (const n of allPlTalkers) if (n !== id) next.add(n);
    this._state.newState = next;
    return this.updateState();
  }

  updateForPlTalkAdd(plNum: number, portNum: number): CrosspointChange[] {
    const { id, plListens, currentState } = this._state;
    //A partyline talker should not hear themselves, nothing to change:
    if (portNum === id) return [];
    //We are already listening to the crosspoint, nothing to change:
    if (currentState.has(portNum)) return [];
    //We aren't listening to the partyline, nothing to change:
    if (!plListens.has(plNum)) return [];

    const next = new Set<number>(currentState);
    next.add(portNum);
    this._state.newState = next;
    return this.updateState();
  }

  updateForPlTalkRemove(plNum: number, portNum: number): CrosspointChange[] {
    const { id, pointToPointListens, plListens, currentState } = this._state;
    //A partyline talker should not hear themselves, nothing to change:
    if (portNum === id) return [];
    //We aren't listening to the crosspoint, nothing to change:
    if (!currentState.has(portNum)) return [];
    //We aren't listening to the partyline, nothing to change:
    if (!plListens.has(plNum)) return [];

    const allPlTalkers = this.getAllPlTalkers();
    if (!allPlTalkers) return [];

    const next = new Set<number>(pointToPointListens);
    //Don't add ourselves:
    for (const n of allPlTalkers) if (n !== id) next.add(n);
    this._state.newState = next;
    return this.updateState();
  }

  updateForPlListenAdd(plNum: number): CrosspointChange[] {
    const { id, plListens, currentState } = this._state;
    //If we are already listening to the partyline, nothing to change:
    if (plListens.has(plNum)) return [];
    plListens.add(plNum);

    const listeningPlTalkers = this.getPlTalks(plNum);
    if (!listeningPlTalkers) {
      this.logger.error(
        `updateForPlListenAdd: Unable to get partyline talkers for partyline ${plNum}`,
      );
      return [];
    }
    const next = new Set<number>(currentState);
    //Don't add ourselves:
    for (const n of listeningPlTalkers) if (n !== id) next.add(n);
    this._state.newState = next;
    return this.updateState();
  }

  updateForPlListenRemove(plNum: number): CrosspointChange[] {
    const { id, plListens, pointToPointListens } = this._state;
    //If we aren't already listening to the partyline, nothing to change:
    if (!plListens.has(plNum)) return [];
    plListens.delete(plNum);

    const allPlTalkers = this.getAllPlTalkers();
    if (!allPlTalkers) return [];

    const next = new Set<number>(pointToPointListens);
    //Don't add ourselves:
    for (const n of allPlTalkers) if (n !== id) next.add(n);
    this._state.newState = next;
    return this.updateState();
  }

  get id(): number {
    return this._state.id;
  }

  get state(): OutputPortState {
    return {
      ...this._state,
      pointToPointListens: new Set(this._state.pointToPointListens),
      plListens: new Set(this._state.plListens),
      currentState: new Set(this._state.currentState),
      newState: new Set(this._state.newState),
    };
  }

  private getAllPlTalkers(): ReadonlySet<number> | null {
    const allPlTalkers: Set<number> = new Set();
    for (const plListen of this._state.plListens) {
      const plTalkers = this.getPlTalks(plListen);
      if (!plTalkers) {
        this.logger.error(
          `getAllPlTalkers: Unable to get partyline talkers for partyline ${plListen}`,
        );
        return null;
      }
      plTalkers.forEach((portNum) => {
        allPlTalkers.add(portNum);
      });
    }
    return allPlTalkers;
  }

  private updateState(): CrosspointChange[] {
    const { id, currentState, newState } = this._state;
    const changes: CrosspointChange[] = [];

    for (const n of newState) {
      if (!currentState.has(n)) {
        changes.push({
          destChannelNum: id,
          srcChannelNum: n,
          state: true,
        });
      }
    }
    for (const n of currentState) {
      if (!newState.has(n)) {
        changes.push({
          destChannelNum: id,
          srcChannelNum: n,
          state: false,
        });
      }
    }
    this._state.currentState = new Set(newState);
    return changes;
  }
}
