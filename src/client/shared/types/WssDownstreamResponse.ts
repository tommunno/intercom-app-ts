//Helpers:
import { dataIsObject, dataIsType } from "../../../shared/helpers.js";
//Types:
import {
  WSS_DOWNSTREAM_PANEL,
  WSS_DOWNSTREAM_SETUP,
  type WssDownstream,
  type WssDownstreamPanel,
} from "../../../shared/protocols/index.js";
import type { ClientWssMode, DownstreamForMode } from "../contracts/index.js";

export interface WssDownstreamResponse<K extends WssDownstream> {
  type: K;
  payload: unknown;
}

export function dataIsWssDownstreamResponse<M extends ClientWssMode>(
  mode: M,
  data: unknown,
): data is WssDownstreamResponse<DownstreamForMode<M>> {
  return (
    dataIsObject(data) &&
    dataIsType("string", data.type) &&
    Object.values(
      mode === "PANEL" ? WSS_DOWNSTREAM_PANEL : WSS_DOWNSTREAM_SETUP,
    ).some((type) => data.type === type) &&
    Object.hasOwn(data, "payload")
  );
}

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
