import type { ITurnServerManager, ILogger } from "../../contracts";

export class TurnServerManager implements ITurnServerManager {
  constructor(private logger: ILogger) {}
}
