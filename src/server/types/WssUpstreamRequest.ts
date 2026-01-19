import {
  WSS_UPSTREAM,
  type WssUpstream,
} from "../../shared/protocols/wssProtocol.js";

// export interface WssUpstreamRequest {
//   type: WssUpstream;
//   payload: Record<string, unknown>;
// }
export interface WssUpstreamRequest {
  type: WssUpstream;
  payload: unknown;
}

//Still need to check/add validation here
export function dataIsWssUpstreamRequest(
  data: unknown,
): data is WssUpstreamRequest {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  if (typeof d.type !== "string") return false;
  const typeExists = Object.values(WSS_UPSTREAM).some(
    (type) => d.type === type,
  );
  if (!typeExists) return false;

  return (
    d.payload !== null &&
    typeof d.payload === "object" &&
    !Array.isArray(d.payload)
  );
}
