import type {
  // Base
  IController,
  ILogger,
  // Audio
  IAudioController,
  IAudioMatrixManager,
  IWebRTCMediaBridge,
  ITailManager,
  // Network
  INetworkController,
  IWebServerManager,
  IWssManager,
  IWebRTCManager,
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
  AudioMatrixManager,
  WebRTCMediaBridge,
  TailManager,
  // Network
  WebServerManager,
  WssManager,
  WebRTCManager,
  TurnServerManager,
  // Data
  AccountManager,
  DataManager,
} from "./managers/index.js";

const logger: ILogger = new Logger();
const webRTCMediaBridge: IWebRTCMediaBridge = new WebRTCMediaBridge(logger);
const tailManager: ITailManager = new TailManager(logger);
const webServerManager: IWebServerManager = new WebServerManager(logger);
const wssManager: IWssManager = new WssManager(logger);
const webRTCManager: IWebRTCManager = new WebRTCManager(logger);
const turnServerManager: ITurnServerManager = new TurnServerManager(logger);
const accountManager: IAccountManager = new AccountManager(logger);
const dataManager: IDataManager = new DataManager(logger);

const audioMatrixManager: IAudioMatrixManager = new AudioMatrixManager(
  webRTCMediaBridge,
  logger
);

const audioController: IAudioController = new AudioController(
  audioMatrixManager,
  tailManager,
  logger
);

const networkController: INetworkController = new NetworkController(
  webServerManager,
  wssManager,
  webRTCManager,
  turnServerManager,
  logger
);

const dataController: IDataController = new DataController(
  accountManager,
  dataManager,
  logger
);

const controller: IController = new Controller(
  audioController,
  networkController,
  dataController,
  logger
);

controller.init();
controller.start();
