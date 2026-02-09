import type { ManagerStatus } from "../../../shared/types/index.js";
import type {
  AudioEngineHandlers,
  IAudioEngineManager,
} from "../../contracts/audio/IAudioEngineManager.js";
import type { ILogger } from "../../contracts/index.js";

//Native binding:
import engine, { type AudioEngine } from "audio-engine";

export class AudioEngineManager implements IAudioEngineManager {
  private status: ManagerStatus = "IDLE";
  private handlers: AudioEngineHandlers | null = null;
  private engine: AudioEngine = engine;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "AudioEngineManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the AudioEngineManager whilst its status is ${this.status}`,
      );
    }
    this.logger.info("PortAudio devices:", this.engine.getPortAudioDevices());
    this.status = "INITIALIZED";
  }

  populate(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the AudioEngineManager whilst its status is ${this.status}`,
      );
    }
    this.createEngine();
    this.status = "POPULATED";
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

  private createEngine(): void {
    // this.engine.createEngine(3, 1, 2, 3);
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
