import type { KeyPressInfo } from "../../shared/types/index.js";
import type { TailInfo } from "./TailInfo.js";

export interface TailProcessListenParams {
  portNum: number;
  keyPressInfo: KeyPressInfo;
  errMessage: string;
  force: boolean;
}

export interface TailProcessTalkOnParams {
  portNum: number;
  keyPressInfo: KeyPressInfo;
  tail: TailInfo;
  portTails: TailInfo[];
  errMessage: string;
  force: boolean;
}

export interface TailProcessTalkOffParams {
  portNum: number;
  keyPressInfo: KeyPressInfo;
  tail: TailInfo;
  portTails: TailInfo[];
  errMessage: string;
  force: boolean;
}
