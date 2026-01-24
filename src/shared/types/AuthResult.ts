export type AuthResult =
  | {
      success: true;
      message: string;
      statusCode: number;
      userId: number;
      newSessionToken: string | null;
      loginTakeover: false;
    }
  | {
      success: true;
      message: string;
      statusCode: number;
      userId: number;
      newSessionToken: string | null;
      loginTakeover: true;
      loggedOutClientId: string;
    }
  | { success: false; message: string; statusCode: number };
