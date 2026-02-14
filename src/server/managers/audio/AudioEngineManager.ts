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
import type { DeviceValidResponse, ILogger } from "../../contracts/index.js";

//Native binding:
import engine, { type AudioEngine, type PortAudioDevice } from "audio-engine";

export class AudioEngineManager implements IAudioEngineManager {
  private status: ManagerStatus = "IDLE";
  private handlers: AudioEngineHandlers | null = null;
  private engine: AudioEngine = engine;
  private config: AudioEngineConfig = {
    numUsers: DEFAULT_NUM_USERS,
    requestedNumSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
    requestedSoundcardId: null,
    numSoundcardChannels: 0,
    soundcardId: 0,
    isReady: false,
  };
  private device: PortAudioDevice | null = null;

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
    const configSuccess = this.setConfig(config);
    if (configSuccess) {
      this.config.isReady = this.createEngine();
    }
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
    this.status = "RUNNING";
  }

  setHandlers(handlers: AudioEngineHandlers): void {
    this.handlers = handlers;
  }

  //Returns true if success
  private setConfig(config: AudioEnginePopulateConfig): boolean {
    //We trust numUsers here. It has been validated by the AccountManager
    this.config.numUsers = config.numUsers;

    this.setRequestedNumSoundcardChannels(config.requestedNumSoundcardChannels);

    this.setRequestedSoundcardId(config.requestedSoundcardId);

    const device = this.setSoundcardId();
    if (!device) return false;

    this.setNumSoundcardChannels(device);

    return true;
  }

  private setRequestedNumSoundcardChannels(num: number | undefined): void {
    if (
      !dataIsType("safeIntegerNum", num) ||
      num < 1 ||
      num > MAX_NUM_SOUNDCARD_CHANNELS
    ) {
      this.logger.error(
        `requestedNumSoundcardChannels is invalid. Will fall back to the default value of ${DEFAULT_NUM_SOUNDCARD_CHANNELS}`,
      );
    } else {
      this.config.requestedNumSoundcardChannels = num;
    }
  }

  private setRequestedSoundcardId(id: number | undefined): void {
    if (id === undefined) return;
    if (!dataIsType("safeIntegerNum", id)) {
      this.logger.error(
        "requestedSoundcardId is not a valid integer. No requestedSoundcardId will be used",
      );
      return;
    }
    this.config.requestedSoundcardId = id;
  }

  //Returns the device associated with the ID if successful
  private setSoundcardId(): PortAudioDevice | null {
    const errMessage =
      "The app requires at least one device with at least one input and one output. If necessary, you can create an aggregate device in Audio MIDI Setup";

    const devices = this.engine.getPortAudioDevices();
    if (devices.length === 0) {
      this.logger.error("There are no soundcard devices. " + errMessage);
      return null;
    }
    const { requestedSoundcardId } = this.config;

    let device: PortAudioDevice | undefined;

    //Try and use the requestedSoundcardId:
    if (requestedSoundcardId !== null) {
      device = devices.find((d) => d.id === requestedSoundcardId);
      if (!device) {
        this.logger.warn(
          `No soundcard device found for ID ${requestedSoundcardId}. Will attempt to use another valid device...`,
        );
      } else {
        const result = this.isDeviceValid(device);
        if (!result.valid) {
          this.logger.warn(
            `Device ${device.name} (ID ${device.id}) is not valid: ${result.errMessage}. Will attempt to use another valid device...`,
          );
          device = undefined;
        }
      }
    }

    //If no device has been found, then attempt to use any other valid device:
    if (!device) {
      device = devices.find((d) => this.isDeviceValid(d).valid);
      if (!device) {
        this.logger.error(
          "There are no valid soundcard devices. " + errMessage,
        );
        return null;
      }
    }

    //We now have a valid device:
    this.config.soundcardId = device.id;
    this.device = device;
    this.logger.success(
      `Successfully set soundcard to ${this.device.name} (device ID: ${this.config.soundcardId})`,
    );
    return device;
  }

  private isDeviceValid(device: PortAudioDevice): DeviceValidResponse {
    const { maxInputChannels: maxIC, maxOutputChannels: maxOC } = device;
    if (maxIC < 1 || maxOC < 1) {
      return {
        valid: false,
        errMessage: `The soundcard device needs to have at least one input and output channel. Currently the device only has ${maxIC} input channel${maxIC === 1 ? "" : "s"} and ${maxOC} output channel${maxOC === 1 ? "" : "s"}`,
      };
    }
    return { valid: true };
  }

  private setNumSoundcardChannels(device: PortAudioDevice): void {
    this.config.numSoundcardChannels = Math.min(
      this.config.requestedNumSoundcardChannels,
      device.maxInputChannels,
      device.maxOutputChannels,
    );
  }

  //Returns true if successful
  private createEngine(): boolean {
    const {
      numUsers: numU,
      numSoundcardChannels: numSC,
      soundcardId: sCId,
    } = this.config;
    this.logger.info(
      `Creating engine with numUsers: ${numU}, numSoundcardChannels: ${numSC}, soundcardId: ${sCId}`,
    );
    try {
      this.engine.createEngine(numU, numSC, numSC, sCId);
    } catch (err) {
      this.logger.error("Error setting up Audio Engine", err);
      return false;
    }
    return true;
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
