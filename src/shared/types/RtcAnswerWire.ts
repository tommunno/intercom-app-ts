import { dataIsObject, dataIsType } from "../helpers.js";

export type RtcAnswerWire = {
  type: "answer";
  sdp: string;
};

export function dataIsRtcAnswerWire(data: unknown): data is RtcAnswerWire {
  return (
    dataIsObject(data) &&
    data.type === "answer" &&
    dataIsType("string", data.sdp)
  );
}
