import { dataIsObject, dataIsType } from "../helpers.js";
import {
  dataIsKeyState,
  dataIsKeyType,
  type KeyState,
  type KeyType,
} from "./index.js";

export interface KeyPressInfo {
  type: KeyType;
  id: number;
  setState: KeyState;
}

export function dataIsKeyPressInfo(data: unknown): data is KeyPressInfo {
  return (
    dataIsObject(data) &&
    dataIsKeyType(data.type) &&
    dataIsType("number", data.id) &&
    dataIsKeyState(data.setState)
  );
}
