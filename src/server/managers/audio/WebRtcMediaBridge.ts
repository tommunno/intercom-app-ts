//Types:
import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type {
  ILogger,
  IWebRtcMediaBridge,
  MediaBridgeHandlers,
  PushHandler,
} from "../../contracts/index.js";
import type {
  MediaBridgeChannel,
  TrackAndStream,
  TxMediaBridgeChannel,
} from "../../types/index.js";
//External libraries:
import wrtc from "@roamhq/wrtc";
import { CHUNK_SIZE } from "../../constants/serverConstants.js";
import { decode } from "node:punycode";
const { RTCAudioSink, RTCAudioSource } = wrtc.nonstandard;

export class WebRtcMediaBridge implements IWebRtcMediaBridge {
  private status: ManagerStatus = "IDLE";
  private handlers: MediaBridgeHandlers | null = null;
  private numChannels: number = 0;
  private channels: MediaBridgeChannel[] = [];
  //For efficient lookup in pushAudio method:
  private txRtcAudioSources: any[] = [];
  private pushAudioRunningErr: boolean = false;
  private pushAudioLengthErr: boolean = false;
  private pushAudioSourceErr: boolean = false;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WebRtcMediaBridge" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the WebRtcMediaBridge whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  populate(numChannels: number): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the WebRtcMediaBridge whilst its status is ${this.status}`,
      );
    }
    this.numChannels = numChannels;
    this.createChannels();
    this.status = "POPULATED";
  }

  start(): void {
    if (this.status !== "POPULATED") {
      throw new Error(
        `Cannot start the WebRtcMediaBridge whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.status = "RUNNING";
  }

  setHandlers(handlers: MediaBridgeHandlers): void {
    this.handlers = handlers;
  }

  //Returns true if success
  addRxTrack(channelNum: number, track: any): boolean {
    const notRunning = this.checkAndWarnIfNotRunning("add RX track");
    if (notRunning) return false;

    const channel = this.channels[channelNum];
    if (!channel) {
      this.logger.error(
        `Unable to add RX track: invalid channelNum ${channelNum}`,
      );
      return false;
    }
    const { rx } = channel;
    if (rx.rtcAudioSink || rx.track) {
      this.logger.error(
        `Cannot add RX track for channelNum ${channelNum}: the channel is currently active`,
      );
      return false;
    }
    rx.rtcAudioSink = new RTCAudioSink(track);
    rx.track = track;

    rx.rtcAudioSink.ondata = (audioData: any) => {
      this.activeHandlers.onAudio(channelNum, audioData.samples);
    };

    return true;
  }

  //Returns true if success
  removeRxTrack(channelNum: number): boolean {
    const notRunning = this.checkAndWarnIfNotRunning("remove RX track");
    if (notRunning) return false;

    const channel = this.channels[channelNum];
    if (!channel) {
      this.logger.warn(
        `Unable to remove RX track for channelNum ${channelNum}: the channel does not exist`,
      );
      return false;
    }

    const { rx } = channel;

    if (rx.rtcAudioSink) {
      try {
        rx.rtcAudioSink.ondata = null;
      } catch (err) {
        this.logger.warn(
          `Unable to set rtcAudioSink.ondata to null for channelNum ${channelNum}`,
          err,
        );
      }
      try {
        rx.rtcAudioSink.stop();
      } catch (err) {
        this.logger.warn(
          `Unable to stop rtcAudioSink for channelNum ${channelNum}`,
          err,
        );
      }
    }
    this.logger.info(`Removed RX track for channelNum ${channelNum}`);
    rx.rtcAudioSink = null;
    rx.track = null;
    return true;
  }

  getTxTrackAndStream(channelNum: number): TrackAndStream | null {
    const notRunning = this.checkAndWarnIfNotRunning("get TX track");
    if (notRunning) return null;

    const channel = this.channels[channelNum];
    if (!channel) {
      this.logger.error(
        `Unable to get TX track for channelNum ${channelNum}: channel does not exist`,
      );
      return null;
    }
    return { track: channel.tx.track, stream: channel.tx.stream };
  }

  pushAudio(buffer: Buffer): void {
    if (this.status !== "RUNNING") {
      if (this.pushAudioRunningErr) return;
      this.logger.error(
        `Unable to push audio because the status is ${this.status}`,
      );
      this.pushAudioRunningErr = true;
      return;
    }
    this.pushAudioRunningErr = false;

    //Create an Int16Array from the underlying ArrayBuffer without copying the data
    const int16 = new Int16Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength / 2,
    );

    const expectedSamples = this.numChannels * CHUNK_SIZE;
    if (int16.length < expectedSamples) {
      if (this.pushAudioLengthErr) return;
      this.logger.error(
        `Unable to push audio: expected ${expectedSamples} samples, got ${int16.length}`,
      );
      this.pushAudioLengthErr = true;
      return;
    }
    this.pushAudioLengthErr = false;

    let begin;
    for (let i = 0; i < this.numChannels; i++) {
      begin = i * CHUNK_SIZE;
      const bufferedOutput = int16.slice(begin, begin + CHUNK_SIZE); // copy: new 960-byte ArrayBuffer

      const rtcAudioSource = this.txRtcAudioSources[i];
      if (!rtcAudioSource) {
        if (this.pushAudioSourceErr) return;
        this.logger.error(
          `Unable to push audio: rtcAudioSource not found at index ${i}`,
        );
        this.pushAudioSourceErr = true;
        return;
      }

      rtcAudioSource.onData({
        samples: bufferedOutput,
        sampleRate: 48000,
        bitsPerSample: 16,
        channelCount: 1,
        numberOfFrames: CHUNK_SIZE,
      });
    }
    this.pushAudioSourceErr = false;
  }

  private createChannels(): void {
    this.channels.length = 0;
    this.txRtcAudioSources.length = 0;

    for (let i = 0; i < this.numChannels; i++) {
      const tx = this.createTxChannel(i);
      this.txRtcAudioSources.push(tx.rtcAudioSource);
      this.channels.push({
        id: i,
        rx: { track: null, rtcAudioSink: null },
        tx,
      });
    }
  }

  private createTxChannel(index: number): TxMediaBridgeChannel {
    const rtcAudioSource = new RTCAudioSource();
    const track = rtcAudioSource.createTrack();
    const stream = new wrtc.MediaStream();
    stream.addTrack(track);
    return {
      track,
      stream,
      rtcAudioSource,
    };
  }

  private get activeHandlers(): MediaBridgeHandlers {
    if (!this.handlers)
      throw new Error("WebRtcMediaBridge handlers not initialized!");
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
