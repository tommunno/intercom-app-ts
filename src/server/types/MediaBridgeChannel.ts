//Types:
import type { RtcMediaStream, RtcMediaStreamTrack } from "./wrtcShimTypes.js";
//External libraries:
import type {
  RTCAudioSink as RTCAudioSinkType,
  RTCAudioSource as RTCAudioSourceType,
} from "@roamhq/wrtc/types/nonstandard.js";

export interface MediaBridgeChannel {
  id: number;
  rx: RxMediaBridgeChannel;
  tx: TxMediaBridgeChannel;
}

export interface RxMediaBridgeChannel {
  track: RtcMediaStreamTrack | null;
  rtcAudioSink: RTCAudioSinkType | null;
}

export interface TxMediaBridgeChannel {
  track: RtcMediaStreamTrack;
  stream: RtcMediaStream;
  rtcAudioSource: RTCAudioSourceType;
}
