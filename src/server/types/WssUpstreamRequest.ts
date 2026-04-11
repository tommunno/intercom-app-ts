//Helpers:
import { dataIsObject } from "../../shared/helpers.js";
//Types:
import {
  WSS_UPSTREAM,
  type WssUpstream,
} from "../../shared/protocols/wssProtocol.js";

export interface WssUpstreamRequest {
  type: WssUpstream;
  payload: unknown;
}

export function dataIsWssUpstreamRequest(
  data: unknown,
): data is WssUpstreamRequest {
  return (
    dataIsObject(data) &&
    typeof data.type === "string" &&
    Object.values(WSS_UPSTREAM).some((type) => data.type === type) &&
    Object.hasOwn(data, "payload")
  );
}
