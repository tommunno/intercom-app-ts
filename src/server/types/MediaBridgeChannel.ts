import type {
  RTCAudioSink,
  RTCAudioSource,
} from "@roamhq/wrtc/types/nonstandard.js";

export interface MediaBridgeChannel {
  id: number;
  rx: RxMediaBridgeChannel;
  tx: TxMediaBridgeChannel;
}

export interface RxMediaBridgeChannel {
  track: any | null;
  rtcAudioSink: RTCAudioSink | null;
}

export interface TxMediaBridgeChannel {
  track: any;
  stream: any;
  rtcAudioSource: RTCAudioSource;
}
