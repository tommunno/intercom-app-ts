import type { MatrixPortType } from "../../shared/types/MatrixPortType.js";

export interface InputGainInfo {
  id: number;
  gain: number;
  type: MatrixPortType;
}
