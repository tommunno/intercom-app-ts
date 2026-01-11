import type { User } from "../../shared/types/index.js";

export interface AccountManagerState {
  numUsers: number;
  users: User[];
}
