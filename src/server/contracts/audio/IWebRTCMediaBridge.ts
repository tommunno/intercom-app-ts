import type { TrackAndStream } from "../../types/TrackAndStream.js";

export interface MediaBridgeHandlers {
  onAudio: (channelNum: number, samples: any) => void;
}

export type PushHandler = (samples: any) => void;

export interface IWebRtcMediaBridge {
  init: () => void;
  populate: (numChannels: number) => void;
  start: () => void;
  setHandlers: (handlers: MediaBridgeHandlers) => void;

  addRxTrack: (channelNum: number, track: any) => boolean;
  removeRxTrack: (channelNum: number) => boolean;

  getTxTrackAndStream: (channelNum: number) => TrackAndStream | null;

  pushAudio: (buffer: Buffer) => void;
}
