export type DisconnectUserParams =
  | {
      userId: number;
      notifyClient: true;
      loginTakeover?: boolean;
      clientId: string;
    }
  | {
      userId: number;
      notifyClient?: false;
      loginTakeover?: boolean;
    };
