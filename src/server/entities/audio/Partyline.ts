import type { SuccessMessage } from "../../../shared/types/SuccessMessage.js";
import type {
  ILogger,
  IPartyline,
  PartylineConfig,
  PartylineSnapshot,
  PartylineState,
} from "../../contracts/index.js";

export class Partyline implements IPartyline {
  private _state: PartylineState;

  constructor(
    config: PartylineConfig,
    private logger: ILogger,
  ) {
    this._state = {
      id: config.id,
      name: config.name,
      numPorts: config.numPorts,
      portsTalking: new Set(config.portsTalking),
      portsListening: new Set(config.portsListening),
    };
    this.logger = this.logger.child({ context: `Partyline ${this._state.id}` });
  }

  get id(): number {
    return this._state.id;
  }

  get name(): string {
    return this._state.name;
  }

  set name(name: string) {
    this._state.name = name;
  }

  get state(): PartylineState {
    return {
      ...this._state,
      portsTalking: new Set(this._state.portsTalking),
      portsListening: new Set(this._state.portsListening),
    };
  }

  isPortTalking(portNum: number): boolean {
    if (!this.isPortNumValid(portNum, "isPortTalking")) {
      return false;
    }

    return this._state.portsTalking.has(portNum);
  }

  isPortListening(portNum: number): boolean {
    if (!this.isPortNumValid(portNum, "isPortListening")) {
      return false;
    }
    return this._state.portsListening.has(portNum);
  }

  setPortTalking(portNum: number, state: boolean): SuccessMessage {
    const success = { success: true, message: "" };

    if (!this.isPortNumValid(portNum, "setPortTalking")) {
      return {
        success: false,
        message: `portNum ${portNum} is invalid`,
      };
    }
    //Talking:
    if (state) {
      if (this._state.portsTalking.has(portNum)) {
        return {
          success: false,
          message: `portNum ${portNum} is already talking`,
        };
      }
      this._state.portsTalking.add(portNum);
      return success;
    }
    //Not talking:
    if (!this._state.portsTalking.delete(portNum)) {
      return {
        success: false,
        message: `portNum ${portNum} is not talking`,
      };
    }
    return success;
  }

  setPortListening(portNum: number, state: boolean): SuccessMessage {
    const success = { success: true, message: "" };

    if (!this.isPortNumValid(portNum, "setPortListening")) {
      return {
        success: false,
        message: `portNum ${portNum} is invalid`,
      };
    }
    //Listening:
    if (state) {
      if (this._state.portsListening.has(portNum)) {
        return {
          success: false,
          message: `portNum ${portNum} is already listening`,
        };
      }
      this._state.portsListening.add(portNum);
      return success;
    }
    //Not listening:
    if (!this._state.portsListening.delete(portNum)) {
      return {
        success: false,
        message: `portNum ${portNum} is not listening`,
      };
    }
    return success;
  }

  getSnapshot(): PartylineSnapshot {
    const { name, portsTalking, portsListening } = this._state;
    return { name, portsTalking, portsListening };
  }

  get portsTalking(): ReadonlySet<number> {
    return this._state.portsTalking;
  }

  get portsListening(): ReadonlySet<number> {
    return this._state.portsListening;
  }

  private isPortNumValid(portNum: number, errContext?: string): boolean {
    const result =
      Number.isSafeInteger(portNum) &&
      portNum >= 0 &&
      portNum < this._state.numPorts;
    if (!result && errContext) {
      this.logger.error(`portNum ${portNum} is not valid in ${errContext}`);
    }
    return result;
  }
}
