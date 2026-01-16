import {
  WSS_TYPES,
  type WssPayloads,
} from "../../shared/protocols/wssProtocol.js";

export interface WssRequest {
  type: keyof WssPayloads;
  payload: Record<string, unknown>;
}
export function dataIsWssRequest(data: unknown): data is WssRequest {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  if (typeof d.type !== "string") return false;
  const typeExists = Object.values(WSS_TYPES).some((type) => d.type === type);
  if (!typeExists) return false;

  return (
    d.payload !== null &&
    typeof d.payload === "object" &&
    !Array.isArray(d.payload)
  );
}
