import type {
  HttpLoginRequest,
  HttpLoginResponse,
  ManagerState,
} from "../../shared/types/index.js";
import type { IHttpManager } from "../contracts/index.js";

export class HttpManager implements IHttpManager {
  private state: ManagerState = "IDLE";

  start(): void {
    if (this.state !== "INITIALIZED") {
      throw new Error(
        `Cannot start the HttpManager whilst its state is ${this.state}`,
      );
    }
    this.state = "RUNNING";
  }

  init(): void {
    if (this.state !== "IDLE") {
      throw new Error(
        `Cannot initialize the HttpManager whilst its state is ${this.state}`,
      );
    }
    this.state = "INITIALIZED";
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
    if (this.state !== "RUNNING") {
      console.error(`Unable to ${action} because the state is ${this.state}`);
      return true;
    }
    return false;
  }
}
