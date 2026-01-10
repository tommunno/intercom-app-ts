import type { ITailManager, ILogger } from "../../contracts";

export class TailManager implements ITailManager {
  constructor(private logger: ILogger) {}
}
