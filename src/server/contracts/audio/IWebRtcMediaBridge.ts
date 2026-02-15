import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type { TrackAndStream, RtcMediaStreamTrack } from "../../types/index.js";

export interface MediaBridgeHandlers {
  onAudio: (channelNum: number, samples: Int16Array) => void;
  onChannelRoutedChange: (channelNum: number, routed: boolean) => boolean;
}

export interface IWebRtcMediaBridge {
  init: () => void;
  populate: (numChannels: number) => void;
  start: () => void;
  setHandlers: (handlers: MediaBridgeHandlers) => void;

  addRxTrack: (channelNum: number, track: RtcMediaStreamTrack) => boolean;
  removeRxTrack: (channelNum: number) => boolean;

  getTxTrackAndStream: (channelNum: number) => TrackAndStream | null;

  pushAudio: (buffer: Buffer) => void;

  status: ManagerStatus;
}
