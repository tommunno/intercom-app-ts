import { dataIsObject, dataIsType } from "../helpers.js";

export interface AdminUserLoggedInUpdate {
  userId: number;
  loggedIn: boolean;
}
export type AdminUsersLoggedInUpdate = AdminUserLoggedInUpdate[];

export function dataIsAdminUserLoggedInUpdate(
  data: unknown,
): data is AdminUserLoggedInUpdate {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.userId) &&
    dataIsType("boolean", data.loggedIn)
  );
}

export function dataIsAdminUsersLoggedInUpdate(
  data: unknown,
): data is AdminUsersLoggedInUpdate {
  return Array.isArray(data) && data.every(dataIsAdminUserLoggedInUpdate);
}
