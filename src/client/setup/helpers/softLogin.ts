import { dataIsHttpLoginResponse } from "../../../shared/types/HttpLoginResponse.js";
import type { IClientLogger } from "../../shared/contracts/index.js";

type SoftLoginParams =
  | { username: string; password: string; logger: IClientLogger }
  | { username: null; password: null; logger: IClientLogger };
type SoftLoginResult = { success: true } | { success: false; message: string };

//If username and password are null, the server will try to log in using the sessionToken instead of credentials
export async function softLogin({
  username,
  password,
  logger,
}: SoftLoginParams): Promise<SoftLoginResult> {
  try {
    const res = await fetch("/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      credentials: "include", // Essential for the session cookies
    });
    const data: unknown = await res.json();
    if (!dataIsHttpLoginResponse(data)) {
      throw new Error("Invalid response from the server");
    }
    if (data.success) {
      return { success: true };
    }
    return { success: false, message: data.message };
  } catch (err) {
    logger.error("Soft Login Error", err);
    return {
      success: false,
      message: "Connection failed. Check your internet.",
    };
  }
}
