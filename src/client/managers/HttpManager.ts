import type {
  HttpLoginRequest,
  HttpLoginResponse,
  ManagerStatus,
} from "../../shared/types/index.js";
import type { IHttpManager } from "../contracts/index.js";

export class HttpManager implements IHttpManager {
  private status: ManagerStatus = "IDLE";

  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the HttpManager whilst its status is ${this.status}`,
      );
    }
    this.status = "RUNNING";
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the HttpManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  async softLogin(request: HttpLoginRequest): Promise<HttpLoginResponse> {
    const notRunning = this.checkAndWarnIfNotRunning("attempt a soft login");
    if (notRunning) return { success: false, message: "Client error" };
    return this.post<HttpLoginRequest, HttpLoginResponse>("/login", request);
  }

  private async post<T, U>(url: string, request: T): Promise<U> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      credentials: "include", // Essential for the session cookies
    });

    return response.json();
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.status !== "RUNNING") {
      console.error(`Unable to ${action} because the status is ${this.status}`);
      return true;
    }
    return false;
  }
}
