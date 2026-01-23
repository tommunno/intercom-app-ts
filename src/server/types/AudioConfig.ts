import {
  MAX_NUM_USERS,
  MAX_NUM_PARTYLINES,
  MAX_NUM_SOUNDCARD_CHANNELS,
} from "../constants/serverConstants.js";

export interface AudioConfig {
  numUsers: number;
  numSoundcardChannels: number;
  numPartylines: number;
}

export type AudioConfigIsValidParams =
  | {
      config: AudioConfig;
      throwErr: true;
      context: string;
    }
  | {
      config: AudioConfig;
      throwErr: false;
    };

export function audioConfigIsValid(params: AudioConfigIsValidParams): boolean {
  const { config, throwErr } = params;
  if (
    config.numUsers > MAX_NUM_USERS ||
    config.numSoundcardChannels > MAX_NUM_SOUNDCARD_CHANNELS ||
    config.numPartylines > MAX_NUM_PARTYLINES
  ) {
    if (throwErr) {
      throw new Error(
        `Can not initialize the ${params.context} with ${config.numUsers} users, ${config.numSoundcardChannels} soundcard channels, and ${config.numPartylines} partylines. Max users allowed: ${MAX_NUM_USERS}, max soundcard channels allowed: ${MAX_NUM_SOUNDCARD_CHANNELS}, max partylines allowed: ${MAX_NUM_PARTYLINES}`,
      );
    }
    return false;
  }
  return true;
}
