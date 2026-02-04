import type { AudioConfig } from "./AudioConfig.js";

//These types are what we get from the DataManager. numUsers cannot be included, because we will get that from the AccountManager (it is important that the AudioMatrixManager shadows the AccountManager when it comes to the number of users):
export interface AudioData {
  audioMatrixData: AudioMatrixData;
}

export type AudioMatrixData = Partial<Omit<AudioConfig, "numUsers">> & {
  numUsers?: never;
};

//These types are what we pass into the AudioController during the populate stage. numUsers is now mandatory:
export interface AudioPopulateData {
  audioMatrixData: AudioMatrixPopulateData;
}

export type AudioMatrixPopulateData = Partial<AudioConfig> &
  Pick<AudioConfig, "numUsers">;
