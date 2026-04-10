import { dataIsObject, dataIsType } from "../helpers.js";

export type AdminPopupType = "success" | "info" | "warning" | "error";

export interface AdminPopup {
  type: AdminPopupType;
  title: string;
  message: string;
}

export function dataIsAdminPopupType(data: unknown): data is AdminPopupType {
  return (
    data === "success" ||
    data === "info" ||
    data === "warning" ||
    data === "error"
  );
}

export function dataIsAdminPopup(data: unknown): data is AdminPopup {
  return (
    dataIsObject(data) &&
    dataIsAdminPopupType(data.type) &&
    dataIsType("string", data.title) &&
    dataIsType("string", data.message)
  );
}
