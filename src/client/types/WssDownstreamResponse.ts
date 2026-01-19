import {
  WSS_DOWNSTREAM,
  type WssDownstream,
  type WssPayloads,
} from "../../shared/protocols/index.js";

export interface WssDownstreamResponse {
  type: WssDownstream;
  payload: unknown;
}

//Still need to check/add validation here
export function dataIsWssDownstreamResponse(
  data: unknown,
): data is WssDownstreamResponse {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  if (typeof d.type !== "string") return false;
  const typeExists = Object.values(WSS_DOWNSTREAM).some(
    (type) => d.type === type,
  );
  if (!typeExists) return false;

  return (
    d.payload !== null &&
    typeof d.payload === "object" &&
    !Array.isArray(d.payload)
  );
}
