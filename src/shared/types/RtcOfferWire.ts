import { dataIsObject, dataIsType } from "../helpers.js";

export type RtcOfferWire = {
  type: "offer";
  sdp: string;
};

export function dataIsRtcOfferWire(data: unknown): data is RtcOfferWire {
  return (
    dataIsObject(data) &&
    data.type === "offer" &&
    dataIsType("string", data.sdp)
  );
}
