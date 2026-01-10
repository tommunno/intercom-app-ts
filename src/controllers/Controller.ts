import type {
  IAudioController,
  IController,
  IDataController,
  ILogger,
  INetworkController,
} from "../contracts";

export class Controller implements IController {
  constructor(
    private audioController: IAudioController,
    private networkController: INetworkController,
    private dataController: IDataController,
    private logger: ILogger
  ) {}

  init(): void {}
  start(): void {}
}
