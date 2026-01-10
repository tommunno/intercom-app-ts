import type { ITailManager, ILogger } from "../../contracts/index.js";

export class TailManager implements ITailManager {
  constructor(private logger: ILogger) {}
}
