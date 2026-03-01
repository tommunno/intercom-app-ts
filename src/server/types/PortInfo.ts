import type { PortType } from "./PortType.js";

export type PortInfo = {
  type: PortType;
  default: boolean;
  value: number | null;
};
