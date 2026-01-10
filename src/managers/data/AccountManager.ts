import type { IAccountManager, ILogger } from "../../contracts";

export class AccountManager implements IAccountManager {
  constructor(private logger: ILogger) {}
}
