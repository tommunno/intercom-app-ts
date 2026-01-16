export interface AuthResult {
  success: boolean;
  message: string;
  statusCode: number;
  userId: number | null;
  newSessionToken: string | null;
  loginTakeover: boolean;
}
