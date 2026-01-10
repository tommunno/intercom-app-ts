import type { IWssManager, ILogger } from "../../contracts";

export class WssManager implements IWssManager {
  constructor(private logger: ILogger) {}
}
