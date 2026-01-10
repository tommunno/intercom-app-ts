import type {
  INetworkController,
  ILogger,
  IWebServerManager,
  IWssManager,
  IWebRTCManager,
  ITurnServerManager,
} from "../contracts/index.js";

export class NetworkController implements INetworkController {
  constructor(
    private webServerManager: IWebServerManager,
    private wssManager: IWssManager,
    private webRTCManager: IWebRTCManager,
    private tuenServerManager: ITurnServerManager,
    private logger: ILogger
  ) {}
}
