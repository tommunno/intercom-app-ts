import type { RtcMediaStream, RtcMediaStreamTrack } from "./wrtcShimTypes.js";

export interface TrackAndStream {
  track: RtcMediaStreamTrack;
  stream: RtcMediaStream;
}
