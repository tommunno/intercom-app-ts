import type { IAccountManager, ILogger } from "../../contracts/index.js";

export class AccountManager implements IAccountManager {
  constructor(private logger: ILogger) {}
}
