export type AuthenticateWithTokenParams =
  | {
      softLogin: true;
      sessionToken: string | null;
    }
  | {
      softLogin: false;
      sessionToken: string | null;
      clientId: string;
    };
