export type DisconnectUserParams = {
  userId: number;
  notifyClient: boolean;
  loginTakeover?: boolean;
  clientId: string;
  closeRtc?: boolean;
  afterAudioRestart?: boolean;
};
// | {
//     userId: number;
//     notifyClient?: false;
//     loginTakeover?: boolean;
//     closeRtc?: boolean;
//   };
