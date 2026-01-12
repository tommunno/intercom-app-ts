import type { ManagerState } from "../../../shared/types/index.js";
import type { IWssManager, ILogger } from "../../contracts/index.js";
import type { Servers } from "../../types/index.js";

export class WssManager implements IWssManager {
  private state: ManagerState = "IDLE";
  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WssManager" });
  }

  init(servers: Servers): void {
    if (this.state !== "IDLE") {
      throw new Error(
        `Cannot initialize the WssManager whilst its state is ${this.state}`
      );
    }
    this.state = "INITIALIZED";
  }

  start(): void {
    if (this.state !== "INITIALIZED") {
      throw new Error(
        `Cannot start the WssManager whilst its state is ${this.state}`
      );
    }
    this.state = "RUNNING";
  }
}
