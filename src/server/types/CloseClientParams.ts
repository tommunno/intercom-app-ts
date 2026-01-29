export type CloseClientParams =
  | {
      logout: true;
      clientId: string;
      hardLogout?: boolean;
      loginTakeover?: boolean;
      notifyClient?: boolean;
    }
  | {
      logout: false;
      clientId: string;
      userId: number;
      loginTakeover?: boolean;
      notifyClient?: boolean;
    };
