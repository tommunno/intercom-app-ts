export type CloseClientParams =
  | {
      logout: true;
      clientId: string;
      hardLogout?: boolean;
      loginTakeover?: boolean;
    }
  | {
      logout: false;
      clientId: string;
      userId: number;
      loginTakeover?: boolean;
    };
