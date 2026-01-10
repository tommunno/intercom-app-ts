import type { IDataManager, ILogger } from "../../contracts/index.js";

export class DataManager implements IDataManager {
  constructor(private logger: ILogger) {}
}
