export type AuthResult =
  | {
      success: true;
      message: string;
      statusCode: number;
      userId: number;
      newSessionToken: string | null;
      loginTakeover: boolean;
    }
  | { success: false; message: string; statusCode: number };
