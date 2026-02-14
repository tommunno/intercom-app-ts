//This is what we get from the DataManager. numUsers cannot be included, because we will get that from the AccountManager (it is important that the AudioController shadows the AccountManager when it comes to the number of users):
export interface AudioData {
  requestedNumSoundcardChannels?: number;
  numPartylines?: number;
  requestedSoundcardId?: number;
}

//This is what we pass into the AudioController during the populate stage. numUsers is now mandatory:
export interface AudioPopulateData {
  numUsers: number;
  requestedNumSoundcardChannels?: number;
  numPartylines?: number;
  requestedSoundcardId?: number;
}
