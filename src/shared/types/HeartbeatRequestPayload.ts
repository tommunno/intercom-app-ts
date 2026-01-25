import { dataIsObject, dataIsType } from "../helpers.js";

export interface HeartbeatRequestPayload {
  timestamp: number;
}

export function dataIsHeartbeatRequestPayload(
  data: unknown,
): data is HeartbeatRequestPayload {
  return dataIsObject(data) && dataIsType("number", data.timestamp);
}
