import type { ITurnServerManager, ILogger } from "../../contracts/index.js";

export class TurnServerManager implements ITurnServerManager {
  constructor(private logger: ILogger) {}
}
