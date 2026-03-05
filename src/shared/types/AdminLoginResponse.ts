import { dataIsObject, dataIsType } from "../helpers.js";
import { dataIsAdminSnapshot, type AdminSnapshot } from "./index.js";

export type AdminLoginResponse =
  | {
      success: true;
      message: string;
      adminSnapshot: AdminSnapshot;
    }
  | { success: false; message: string };

export function dataIsAdminLoginResponse(
  data: unknown,
): data is AdminLoginResponse {
  return (
    dataIsObject(data) &&
    dataIsType("boolean", data.success) &&
    dataIsType("string", data.message) &&
    (data.success ? dataIsAdminSnapshot(data.adminSnapshot) : true)
  );
}
