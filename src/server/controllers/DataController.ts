import type {
  IAccountManager,
  IDataController,
  IDataManager,
  ILogger,
} from "../contracts/index.js";

export class DataController implements IDataController {
  constructor(
    private accountManager: IAccountManager,
    private dataManager: IDataManager,
    private logger: ILogger
  ) {}
}
