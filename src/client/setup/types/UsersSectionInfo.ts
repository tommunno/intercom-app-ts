export interface UserSectionInfo {
  id: number;
  loggedIn: boolean;
  username: string;
  changedUsername: string;
  usernameErr: boolean;
  changedPassword: string;
  passwordErr: boolean;
  allowedPls: Set<number>;
  changedAllowedPls: string;
  allowedPlsErr: boolean;
}

export type UsersSectionInfo = UserSectionInfo[];
