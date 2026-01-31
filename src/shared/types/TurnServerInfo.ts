import { dataIsObject, dataIsType } from "../helpers.js";
import {
  dataIsTurnServerCredentials,
  type TurnServerCredentials,
} from "./index.js";

export interface TurnServerInfo {
  port: number;
  credentials: TurnServerCredentials;
}

export function dataIsTurnServerInfo(data: unknown): data is TurnServerInfo {
  return (
    dataIsObject(data) &&
    dataIsType("number", data.port) &&
    dataIsTurnServerCredentials(data.credentials)
  );
}
