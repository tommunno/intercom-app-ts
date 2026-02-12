import { dataIsType } from "../../../shared/helpers.js";
import type { ManagerStatus } from "../../../shared/types/index.js";
import {
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
  DEFAULT_NUM_USERS,
  MAX_NUM_SOUNDCARD_CHANNELS,
} from "../../constants/serverConstants.js";
import {
  type AudioEngineConfig,
  type AudioEngineHandlers,
  type AudioEnginePopulateConfig,
  type IAudioEngineManager,
} from "../../contracts/audio/IAudioEngineManager.js";
import type { ILogger } from "../../contracts/index.js";

//Native binding:
import engine, { type AudioEngine } from "audio-engine";

export class AudioEngineManager implements IAudioEngineManager {
  private status: ManagerStatus = "IDLE";
  private handlers: AudioEngineHandlers | null = null;
  private engine: AudioEngine = engine;
  private config: AudioEngineConfig = {
    numUsers: DEFAULT_NUM_USERS,
    numSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
    soundcardDeviceId: 0,
  };

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "AudioEngineManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the AudioEngineManager whilst its status is ${this.status}`,
      );
    }
    this.addAudioEngineLoggingCallback();
    this.logger.info("PortAudio devices:", this.engine.getPortAudioDevices());
    this.status = "INITIALIZED";
  }

  populate(config: AudioEnginePopulateConfig): AudioEngineConfig {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the AudioEngineManager whilst its status is ${this.status}`,
      );
    }
    this.setConfig(config);
    this.status = "POPULATED";
    return this.config;
  }

  start(): void {
    if (this.status !== "POPULATED") {
      throw new Error(
        `Cannot start the AudioEngineManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.createEngine();
    this.status = "RUNNING";
  }

  setHandlers(handlers: AudioEngineHandlers): void {
    this.handlers = handlers;
  }

  //Add in real logic here, using help from native engine
  private setConfig(config: AudioEnginePopulateConfig): void {
    const {
      numUsers: nU,
      numSoundcardChannels: nSC,
      soundcardDeviceId: sDId,
    } = config;

    //We trust numUsers here. It has been validated by the AccountManager
    this.config.numUsers = nU;

    if (
      !dataIsType("safeIntegerNum", nSC) ||
      nSC < 1 ||
      nSC > MAX_NUM_SOUNDCARD_CHANNELS
    ) {
      this.logger.error(
        `numSoundcardChannels is invalid. Will fall back to the default value of ${DEFAULT_NUM_SOUNDCARD_CHANNELS}`,
      );
    } else {
      this.config.numSoundcardChannels = nSC;
    }

    //Test logic:
    this.config.soundcardDeviceId = sDId ?? 0;
  }

  private createEngine(): void {
    const {
      numUsers: nU,
      numSoundcardChannels: nSC,
      soundcardDeviceId: sDId,
    } = this.config;
    this.logger.info(
      `Creating engine with numUsers: ${nU}, numSoundcardChannels: ${nSC}, soundcardDeviceId: ${sDId}`,
    );
    // this.engine.createEngine(nU, nSC, nSC, sDId);
  }

  private addAudioEngineLoggingCallback(): void {
    try {
      this.engine.addLoggingCallback((message, type, toAdminPanel) => {
        if (
          typeof message !== "string" ||
          typeof type !== "string" ||
          typeof toAdminPanel !== "boolean"
        ) {
          this.logger.error(
            "Invalid log message fed from AudioEngine. Expecting <string> for both message and type, and <boolean> for toAdminPanel",
          );
          return;
        }
        //Use toAdminPanel in the future too
        switch (type) {
          case "INFO": {
            this.logger.info(message);
            break;
          }
          case "SUCCESS": {
            this.logger.success(message);
            break;
          }
          case "WARNING": {
            this.logger.warn(message);
            break;
          }
          case "ERROR": {
            this.logger.error(message);
            break;
          }
          default: {
            this.logger.error(`Invalid log type ${type} fed from AudioEngine`);
          }
        }
      });
    } catch (error) {
      this.logger.error("Error adding logging callback to AudioEngine", error);
    }
  }

  private get activeHandlers(): AudioEngineHandlers {
    if (!this.handlers)
      throw new Error("AudioEngineManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this.status}`,
      );
      return true;
    }
    return false;
  }
}
