export type AdminAuthResult =
  | {
      success: true;
      message: string;
      statusCode: number;
      newSessionToken: string | null;
    }
  | {
      success: false;
      message: string;
      statusCode: number;
    };
