import type { IWssManager, ILogger } from "../../contracts/index.js";

export class WssManager implements IWssManager {
  constructor(private logger: ILogger) {}
}
