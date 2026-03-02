import type { PortType } from "./PortType.js";

export type PortInfo<K extends PortType> = {
  type: K;
  default: boolean;
  inputValue: number | undefined;
  outputValue: number | null;
};

export type PortInfos = { [K in PortType]: PortInfo<K> };
