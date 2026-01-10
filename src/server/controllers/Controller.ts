import type {
  IAudioController,
  IController,
  IDataController,
  ILogger,
  INetworkController,
} from "../contracts/index.js";

export class Controller implements IController {
  constructor(
    private audioController: IAudioController,
    private networkController: INetworkController,
    private dataController: IDataController,
    private logger: ILogger
  ) {}

  init(): void {
    console.log("Initializing Controller");
    this.networkController.init();
  }
  start(): void {
    console.log("Starting Controller");
    this.networkController.start();
  }
}
