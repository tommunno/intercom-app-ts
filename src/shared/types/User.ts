export interface BaseUser {
  id: number;
  username: string;
  password: string | null;
}

export interface User extends BaseUser {
  loggedIn: boolean;
  clientId: string | null;
  sessionTokenInUse: string | null;
  sessionTokens: string[];
}
