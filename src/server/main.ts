import type {
  // Base
  IController,
  ILogger,
  // Audio
  IAudioController,
  IAudioEngineManager,
  IAudioMatrixManager,
  IWebRtcMediaBridge,
  ITailManager,
  // Network
  INetworkController,
  IWebServerManager,
  IWssManager,
  IWebRtcManager,
  ITurnServerManager,
  // Data
  IDataController,
  IAccountManager,
  IDataManager,
} from "./contracts/index.js";

import {
  Controller,
  AudioController,
  DataController,
  NetworkController,
} from "./controllers/index.js";

import {
  //Base
  Logger,
  // Audio
  AudioEngineManager,
  AudioMatrixManager,
  WebRtcMediaBridge,
  TailManager,
  // Network
  WebServerManager,
  WssManager,
  WebRtcManager,
  TurnServerManager,
  // Data
  AccountManager,
  DataManager,
} from "./managers/index.js";

const logger: ILogger = new Logger();
const audioEngineManager: IAudioEngineManager = new AudioEngineManager(logger);
const audioMatrixManager: IAudioMatrixManager = new AudioMatrixManager(logger);
const tailManager: ITailManager = new TailManager(logger);
const webRtcMediaBridge: IWebRtcMediaBridge = new WebRtcMediaBridge(logger);
const webServerManager: IWebServerManager = new WebServerManager(logger);
const wssManager: IWssManager = new WssManager(logger);
const webRtcManager: IWebRtcManager = new WebRtcManager(logger);
const turnServerManager: ITurnServerManager = new TurnServerManager(logger);
const accountManager: IAccountManager = new AccountManager(logger);
const dataManager: IDataManager = new DataManager(logger);

const audioController: IAudioController = new AudioController(
  audioEngineManager,
  audioMatrixManager,
  tailManager,
  webRtcMediaBridge,
  logger,
);

const networkController: INetworkController = new NetworkController(
  webServerManager,
  wssManager,
  webRtcManager,
  turnServerManager,
  logger,
);

const dataController: IDataController = new DataController(
  accountManager,
  dataManager,
  logger,
);

const controller: IController = new Controller(
  audioController,
  networkController,
  dataController,
  logger,
);

await controller.init();
controller.start();
