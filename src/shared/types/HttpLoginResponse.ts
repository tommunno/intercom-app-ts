import { dataIsObject, dataIsType } from "../helpers.js";

export interface HttpLoginResponse {
  success: boolean;
  message: string;
}

export function dataIsHttpLoginResponse(
  data: unknown,
): data is HttpLoginResponse {
  return (
    dataIsObject(data) &&
    dataIsType("boolean", data.success) &&
    dataIsType("string", data.message)
  );
}
