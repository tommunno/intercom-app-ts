export interface LogoutClientParams {
  clientId: string;
  hardLogout?: boolean;
  notifyClient?: boolean;
  loginTakeover?: boolean;
  closeRtc?: boolean;
  afterAudioRestart?: boolean;
}
