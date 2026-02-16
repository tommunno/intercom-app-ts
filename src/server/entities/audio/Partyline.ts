import type { SuccessMessage } from "../../../shared/types/SuccessMessage.js";
import type {
  ILogger,
  IPartyline,
  PartylineConfig,
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
      numUsers: config.numUsers,
      numSoundcardChannels: config.numSoundcardChannels,
      portsTalking: new Set(config.portsTalking),
      portsListening: new Set(config.portsListening),
    };
    this.logger = this.logger.child({ context: `Partyline ${this._state.id}` });
  }

  get id(): number {
    return this._state.id;
  }

  get state(): PartylineState {
    return {
      ...this._state,
      portsTalking: new Set(this._state.portsTalking),
      portsListening: new Set(this._state.portsListening),
    };
  }

  isUserTalking(userId: number): boolean {
    if (!this.isUserIdValid(userId, "isUserTalking")) {
      return false;
    }

    return this._state.portsTalking.has(userId);
  }

  isUserListening(userId: number): boolean {
    if (!this.isUserIdValid(userId, "isUserListening")) {
      return false;
    }
    return this._state.portsListening.has(userId);
  }

  setUserTalking(userId: number, state: boolean): SuccessMessage {
    const success = { success: true, message: "" };

    if (!this.isUserIdValid(userId, "setUserTalking")) {
      return {
        success: false,
        message: `userId ${userId} is invalid`,
      };
    }
    //Talking:
    if (state) {
      if (this._state.portsTalking.has(userId)) {
        return {
          success: false,
          message: `userId ${userId} is already talking`,
        };
      }
      this._state.portsTalking.add(userId);
      return success;
    }
    //Not talking:
    if (!this._state.portsTalking.delete(userId)) {
      return {
        success: false,
        message: `userId ${userId} is not talking`,
      };
    }
    return success;
  }

  setUserListening(userId: number, state: boolean): SuccessMessage {
    const success = { success: true, message: "" };

    if (!this.isUserIdValid(userId, "setUserListening")) {
      return {
        success: false,
        message: `userId ${userId} is invalid`,
      };
    }
    //Listening:
    if (state) {
      if (this._state.portsListening.has(userId)) {
        return {
          success: false,
          message: `userId ${userId} is already listening`,
        };
      }
      this._state.portsListening.add(userId);
      return success;
    }
    //Not listening:
    if (!this._state.portsListening.delete(userId)) {
      return {
        success: false,
        message: `userId ${userId} is not listening`,
      };
    }
    return success;
  }

  private isUserIdValid(userId: number, errContext?: string): boolean {
    const result =
      Number.isSafeInteger(userId) &&
      userId >= 0 &&
      userId < this._state.numUsers;
    if (!result && errContext) {
      this.logger.error(`userId ${userId} is not valid in ${errContext}`);
    }
    return result;
  }
}
