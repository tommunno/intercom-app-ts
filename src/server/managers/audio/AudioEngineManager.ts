import { dataIsType } from "../../../shared/helpers.js";
import type {
  AdminInputGainsInfo,
  AdminSoundcardsInfo,
  ManagerStatus,
} from "../../../shared/types/index.js";
import type { CrosspointChange } from "../../types/index.js";
import {
  DEFAULT_NUM_SOUNDCARD_CHANNELS,
  DEFAULT_NUM_USERS,
  MAX_NUM_SOUNDCARD_CHANNELS,
} from "../../../shared/constants/sharedConstants.js";
import {
  type AudioEngineConfig,
  type AudioEngineHandlers,
  type AudioEnginePopulateConfig,
  type IAudioEngineManager,
} from "../../contracts/audio/IAudioEngineManager.js";
import type {
  AudioEngineSaveSnapshot,
  DeviceValidResponse,
  ILogger,
} from "../../contracts/index.js";

//Native binding:
import engine, { type AudioEngine, type PortAudioDevice } from "audio-engine";
import { AUDIO_LOSS_DETECTION_TIME_MS } from "../../constants/serverConstants.js";

const BLANK_AUDIO_ENGINE_CONFIG: AudioEngineConfig = {
  numUsers: DEFAULT_NUM_USERS,
  requestedNumSoundcardChannels: DEFAULT_NUM_SOUNDCARD_CHANNELS,
  requestedSoundcardId: null,
  numSoundcardChannels: 0,
  numTotalChannels: 0,
  soundcardId: 0,
  isReady: false,
};

export class AudioEngineManager implements IAudioEngineManager {
  private _status: ManagerStatus = "IDLE";
  private handlers: AudioEngineHandlers | null = null;
  private engine: AudioEngine = engine;
  private _config: AudioEngineConfig = { ...BLANK_AUDIO_ENGINE_CONFIG };
  private devices: PortAudioDevice[] = [];
  private device: PortAudioDevice | null = null;
  private pushAudioRunningErr: boolean = false;
  private engineCreated: boolean = false;
  private pushAudioChannelErrs: boolean[] = [];
  private detectAudioLossErr: boolean = false;
  //This will be true if there are no valid soundcard devices present:
  private soundcardDevicesErr: boolean = false;
  //This is set to true if the audioEngine detects a loss of audio:
  private audioLossDetected: boolean = false;
  private audioLossDetectionTimerId: ReturnType<typeof setInterval> | null =
    null;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "AudioEngineManager" });
  }

  init(): void {
    if (this._status !== "IDLE") {
      throw new Error(
        `Cannot initialize the AudioEngineManager whilst its status is ${this._status}`,
      );
    }
    this.addLoggingCallback();
    this.devices = this.engine.getPortAudioDevices();
    this.logger.info("PortAudio Devices:", this.devices);
    this._status = "INITIALIZED";
  }

  populate(config: AudioEnginePopulateConfig): AudioEngineConfig {
    if (this._status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the AudioEngineManager whilst its status is ${this._status}`,
      );
    }
    const configSuccess = this.setConfig(config);
    this.createPushAudioChannelErrs();
    if (configSuccess) {
      this._config.isReady = this.createEngine();
    }
    this._status = "POPULATED";
    return this.config;
  }

  start(): void {
    if (this._status !== "POPULATED") {
      throw new Error(
        `Cannot start the AudioEngineManager whilst its status is ${this._status}`,
      );
    }
    if (!this.config.isReady) {
      throw new Error(`Cannot start the AudioEngineManager: isReady is false`);
    }
    if (!this.engineCreated) {
      throw new Error(
        "Invariant violation: start() called but engineCreated is false",
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.addAudioCallback();
    this.startAudioLossDetection();
    this._status = "RUNNING";
  }

  stop(): AudioEngineConfig {
    //The native engine logging callback is TSFN. So don't be concerned if you see native stop logs happening 'after' JS start logs when restarting the engine!
    //The log messages are queued, and get executed after the JS block of code has run
    const config = { ...this._config };

    if (this._status === "IDLE" || this._status === "INITIALIZED") {
      return config;
    }

    // Only try to stop engine if it was created in the first place
    if (this.engineCreated) {
      try {
        //PortAudio will be terminated if terminatePortAudio is true
        this.engine.stopEngine(true);
      } catch (error) {
        this.logger.error("Error stopping AudioEngine", error);
      }
    }

    this.stopAudioLossDetection();
    this.resetRuntimeFields();

    this._status = "INITIALIZED";
    return config;
  }

  setHandlers(handlers: AudioEngineHandlers): void {
    this.handlers = handlers;
  }

  setChannelRouted(channelNum: number, routed: boolean): boolean {
    const notRunning = this.checkAndWarnIfNotRunning("set channel routed");
    if (notRunning) return false;
    try {
      const isRouted = this.engine.isBufferedInputRouted(channelNum);
      //If we are trying to set the channel to a routed status:
      if (routed) {
        if (isRouted) {
          throw new Error(`Channel is already routed`);
        }
        this.engine.setBufferedInputRouted(channelNum, true);
        this.logger.success(`Set channel ${channelNum} routed`);
        return true;
      }
      //If we are trying to set channel to an unrouted status:
      if (!isRouted) {
        this.logger.warn(
          `Unable to set channelNum ${channelNum} to unrouted: the channel is already unrouted`,
        );
        return false;
      }
      this.engine.setBufferedInputRouted(channelNum, false);
      this.logger.success(`Set channel ${channelNum} unrouted`);
      return true;
    } catch (err) {
      this.logger.error(
        `Unable to set channelNum ${channelNum} to ${routed ? "" : "un"}routed`,
        err,
      );
      return false;
    }
  }

  pushAudio(channelNum: number, samples: Int16Array): void {
    if (this._status !== "RUNNING") {
      if (this.pushAudioRunningErr) return;
      this.logger.error(
        `Unable to push audio because the status is ${this._status}`,
      );
      this.pushAudioRunningErr = true;
      return;
    }
    this.pushAudioRunningErr = false;
    try {
      if (channelNum < 0 || channelNum >= this._config.numUsers) {
        throw new Error(`channelNum invalid`);
      }
      this.engine.routeToBufferedInput(channelNum, samples);
      this.pushAudioChannelErrs[channelNum] = false;
    } catch (err) {
      if (this.pushAudioChannelErrs[channelNum]) {
        return;
      }
      this.logger.error(
        `Unable to push audio for channelNum ${channelNum}`,
        err,
      );
      this.pushAudioChannelErrs[channelNum] = true;
    }
  }

  updateCrosspoint({
    destChannelNum,
    srcChannelNum,
    state,
  }: CrosspointChange): boolean {
    const notRunning = this.checkAndWarnIfNotRunning("update crosspoint");
    if (notRunning) return false;
    try {
      this.engine.updateMixerCrosspoint(destChannelNum, srcChannelNum, state);
      this.logger.info(
        `Crosspoint ${state ? "closed" : "opened"} for destChannelnum ${destChannelNum} and srcChannelNum ${srcChannelNum}`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Unable to ${state ? "close" : "open"} crosspoint for destChannelnum ${destChannelNum} and srcChannelNum ${srcChannelNum}`,
        err,
      );
      return false;
    }
  }

  //Still need to fill in:
  getAdminInputGainsInfo(): AdminInputGainsInfo {
    return {};
  }

  getAdminSoundcardsInfo(): AdminSoundcardsInfo {
    const notRunning = this.checkAndWarnIfNotRunning(
      "get admin soundcards info",
    );
    if (notRunning) return [];
    return this.devices
      .filter((d) => this.isDeviceValid(d).valid)
      .map((d) => {
        const {
          id,
          name,
          maxInputChannels,
          maxOutputChannels,
          defaultSampleRate,
        } = d;
        return {
          id,
          name,
          maxInputChannels,
          maxOutputChannels,
          defaultSampleRate,
          selected: d.id === this.device?.id,
        };
      });
  }

  getAdminAudioBannersInfo(): {
    audioLossDetected: boolean;
    soundcardDevicesErr: boolean;
  } {
    return {
      audioLossDetected: this.audioLossDetected,
      soundcardDevicesErr: this.soundcardDevicesErr,
    };
  }

  getSaveSnapshot(): AudioEngineSaveSnapshot | null {
    const notRunning = this.checkAndWarnIfNotRunning("get save snapshot");
    if (notRunning) return null;
    if (this._config.requestedSoundcardId === null) {
      return {
        requestedNumSoundcardChannels:
          this._config.requestedNumSoundcardChannels,
      };
    }
    return {
      requestedNumSoundcardChannels: this._config.requestedNumSoundcardChannels,
      requestedSoundcardId: this._config.requestedSoundcardId,
    };
  }

  get status(): ManagerStatus {
    return this._status;
  }

  get config(): AudioEngineConfig {
    return { ...this._config };
  }

  //Returns true if success
  private setConfig(config: AudioEnginePopulateConfig): boolean {
    //We trust numUsers here. It has been validated by the AccountManager
    this._config.numUsers = config.numUsers;

    this.setRequestedNumSoundcardChannels(config.requestedNumSoundcardChannels);

    this.setRequestedSoundcardId(config.requestedSoundcardId);

    const device = this.setSoundcardId();
    if (!device) {
      this.soundcardDevicesErr = true;
      return false;
    }

    this.setNumSoundcardChannels(device);

    this._config.numTotalChannels =
      this._config.numUsers + this._config.numSoundcardChannels;

    return true;
  }

  private createPushAudioChannelErrs(): void {
    this.pushAudioChannelErrs = Array.from(
      { length: this._config.numUsers },
      () => false,
    );
  }

  private setRequestedNumSoundcardChannels(num: number | undefined): void {
    if (num === undefined) {
      this.logger.warn(
        `No soundcard channel count provided. Will fall back to the default value of ${DEFAULT_NUM_SOUNDCARD_CHANNELS}`,
      );
    } else if (
      !dataIsType("safeIntegerNum", num) ||
      num < 1 ||
      num > MAX_NUM_SOUNDCARD_CHANNELS
    ) {
      this.logger.error(
        `requestedNumSoundcardChannels is invalid. Will fall back to the default value of ${DEFAULT_NUM_SOUNDCARD_CHANNELS}`,
      );
    } else {
      this._config.requestedNumSoundcardChannels = num;
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
    this._config.requestedSoundcardId = id;
  }

  //Returns the device associated with the ID if successful
  private setSoundcardId(): PortAudioDevice | null {
    const errMessage =
      "The app requires at least one device with at least one input and one output. If necessary, you can create an aggregate device in Audio MIDI Setup";

    if (this.devices.length === 0) {
      this.logger.error("There are no soundcard devices. " + errMessage);
      return null;
    }
    const { requestedSoundcardId } = this._config;

    let device: PortAudioDevice | undefined;

    //Try and use the requestedSoundcardId:
    if (requestedSoundcardId !== null) {
      device = this.devices.find((d) => d.id === requestedSoundcardId);
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
      device = this.devices.find((d) => this.isDeviceValid(d).valid);
      if (!device) {
        this.logger.error(
          "There are no valid soundcard devices. " + errMessage,
        );
        return null;
      }
    }

    //We now have a valid device:
    this._config.soundcardId = device.id;
    this.device = device;
    this.logger.success(
      `Successfully set soundcard to ${this.device.name} (device ID: ${this._config.soundcardId})`,
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
    this._config.numSoundcardChannels = Math.min(
      this._config.requestedNumSoundcardChannels,
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
    } = this._config;
    this.logger.info(
      `Creating engine with numUsers: ${numU}, numSoundcardChannels: ${numSC}, soundcardId: ${sCId}`,
    );
    try {
      this.engine.createEngine(numU, numSC, numSC, sCId);
      this.engineCreated = true;
    } catch (err) {
      this.logger.error("Error setting up Audio Engine", err);
      return false;
    }
    return true;
  }

  private addAudioCallback(): void {
    try {
      this.engine.registerAudioCallback(this.activeHandlers.onAudio);
    } catch (err) {
      this.logger.error("Unable to add audio callback", err);
    }
  }

  private addLoggingCallback(): void {
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

  private startAudioLossDetection(): void {
    this.audioLossDetectionTimerId = setInterval(
      () => this.detectAudioLoss(),
      AUDIO_LOSS_DETECTION_TIME_MS,
    );
  }

  private stopAudioLossDetection(): void {
    if (this.audioLossDetectionTimerId !== null) {
      clearInterval(this.audioLossDetectionTimerId);
      this.audioLossDetectionTimerId = null;
      this.audioLossDetected = false;
    }
  }

  private detectAudioLoss(): void {
    const prevLossDetected = this.audioLossDetected;
    try {
      this.audioLossDetected = !this.engine.isSoundcardAlive();
      this.detectAudioLossErr = false;
    } catch (err) {
      if (this.detectAudioLossErr) {
        return;
      }
      this.logger.error("detectAudioLoss error:", err);
      this.detectAudioLossErr = true;
      return;
    }
    if (prevLossDetected !== this.audioLossDetected) {
      this.activeHandlers.onAudioLossDetectedChange(this.audioLossDetected);
      if (this.audioLossDetected) {
        this.logger.error("Soundcard audio loss detected");
        return;
      }
      this.logger.success("Soundcard audio recovered");
    }
  }

  private resetRuntimeFields(): void {
    this._config = { ...BLANK_AUDIO_ENGINE_CONFIG };
    this.device = null;
    this.engineCreated = false;
    this.pushAudioRunningErr = false;
    this.pushAudioChannelErrs = [];
    this.detectAudioLossErr = false;
    this.soundcardDevicesErr = false;
    this.audioLossDetected = false;
    this.audioLossDetectionTimerId = null;
  }

  private get activeHandlers(): AudioEngineHandlers {
    if (!this.handlers)
      throw new Error("AudioEngineManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this._status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this._status}`,
      );
      return true;
    }
    return false;
  }
}
