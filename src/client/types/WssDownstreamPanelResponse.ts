//Helpers:
import { dataIsObject, dataIsType } from "../../shared/helpers.js";
//Types:
import {
  WSS_DOWNSTREAM_PANEL,
  type WssDownstreamPanel,
} from "../../shared/protocols/index.js";

export interface WssDownstreamPanelResponse {
  type: WssDownstreamPanel;
  payload: unknown;
}

export function dataIsWssDownstreamPanelResponse(
  data: unknown,
): data is WssDownstreamPanelResponse {
  return (
    dataIsObject(data) &&
    dataIsType("string", data.type) &&
    Object.values(WSS_DOWNSTREAM_PANEL).some((type) => data.type === type) &&
    Object.hasOwn(data, "payload")
  );
}
