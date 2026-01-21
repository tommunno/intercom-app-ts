//Helpers:
import { dataIsObject, dataIsType } from "../../shared/helpers.js";
//Types:
import {
  WSS_DOWNSTREAM,
  type WssDownstream,
} from "../../shared/protocols/index.js";

export interface WssDownstreamResponse {
  type: WssDownstream;
  payload: unknown;
}

export function dataIsWssDownstreamResponse(
  data: unknown,
): data is WssDownstreamResponse {
  return (
    dataIsObject(data) &&
    dataIsType("string", data.type) &&
    Object.values(WSS_DOWNSTREAM).some((type) => data.type === type) &&
    Object.hasOwn(data, "payload")
  );
}
