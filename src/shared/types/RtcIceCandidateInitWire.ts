import {
  dataIsObject,
  dataIsType,
  dataIsTypeAOrBOptional,
} from "../helpers.js";

export interface RtcIceCandidateInitWire {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

export function dataIsRtcIceCandidateInitWire(
  data: unknown,
): data is RtcIceCandidateInitWire {
  return (
    dataIsObject(data) &&
    dataIsType("string", data.candidate) &&
    dataIsTypeAOrBOptional("number", "null", data.sdpMLineIndex) &&
    dataIsTypeAOrBOptional("string", "null", data.sdpMid) &&
    dataIsTypeAOrBOptional("string", "null", data.usernameFragment)
  );
}
