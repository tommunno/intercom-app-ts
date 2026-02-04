import type { PersistedUser } from "../../shared/types/User.js";

export interface AccountData {
  numUsers?: number;
  persistedUsers?: PersistedUsers;
}

export type PersistedUsers = Record<number, PersistedUser>;
