import { dataIsObject, dataIsType, dataIsTypeAOrB } from "../helpers.js";

export interface AdminUserChangeRequest {
  userId: number;
  username: string | null;
  password: string | null;
  allowedPls: number[] | null;
}

export type AdminUsersChangeRequest = AdminUserChangeRequest[];

export function dataIsAdminUserChangeRequest(
  data: unknown,
): data is AdminUserChangeRequest {
  return (
    dataIsObject(data) &&
    dataIsType("safeIntegerNum", data.userId) &&
    dataIsTypeAOrB("string", "null", data.username) &&
    dataIsTypeAOrB("string", "null", data.password) &&
    (dataIsType("null", data.allowedPls) ||
      (Array.isArray(data.allowedPls) &&
        data.allowedPls.every((el) => dataIsType("safeIntegerNum", el))))
  );
}

export function dataIsAdminUsersChangeRequest(
  data: unknown,
): data is AdminUsersChangeRequest {
  return Array.isArray(data) && data.every(dataIsAdminUserChangeRequest);
}
