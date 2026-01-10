import type {
  // Base
  IController,
  ILogger,
  // Audio
  IAudioController,
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
const webRTCMediaBridge: IWebRtcMediaBridge = new WebRtcMediaBridge(logger);
const tailManager: ITailManager = new TailManager(logger);
const webServerManager: IWebServerManager = new WebServerManager(logger);
const wssManager: IWssManager = new WssManager(logger);
const webRtcManager: IWebRtcManager = new WebRtcManager(logger);
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
  webRtcManager,
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
