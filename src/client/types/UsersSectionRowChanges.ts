export interface UsersSectionRowChanges {
  newUsername: string | null;
  newPassword: string | null;
  //If there is a change to the allowedPls, that change can be a valid set or "INVALID". Both are still a change:
  newAllowedPls: Set<number> | "INVALID" | null;
  currUsername: string;
  currAllowedPls: Set<number>;
  usernameError: boolean;
  passwordError: boolean;
  allowedPlsError: boolean;
}
