import type { AudioConfig } from "./AudioConfig.js";

export interface AudioData {
  audioMatrixData: AudioMatrixData;
}

//Everything from AudioConfig to be optional, other than numUsers which is required
export type AudioMatrixData = Partial<AudioConfig> &
  Pick<AudioConfig, "numUsers">;
