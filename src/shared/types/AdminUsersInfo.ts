import { dataIsObject, dataIsType } from "../helpers.js";

export interface AdminUserInfo {
  loggedIn: boolean;
  username: string;
  allowedPls: number[];
}

export type AdminUsersInfo = AdminUserInfo[];

export function dataIsAdminUserInfo(data: unknown): data is AdminUserInfo {
  return (
    dataIsObject(data) &&
    dataIsType("boolean", data.loggedIn) &&
    dataIsType("string", data.username) &&
    Array.isArray(data.allowedPls) &&
    data.allowedPls.every((el) => dataIsType("safeIntegerNum", el))
  );
}

export function dataIsAdminUsersInfo(data: unknown): data is AdminUsersInfo {
  return Array.isArray(data) && data.every(dataIsAdminUserInfo);
}
