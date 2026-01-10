import type { IDataManager, ILogger } from "../../contracts";

export class DataManager implements IDataManager {
  constructor(private logger: ILogger) {}
}
