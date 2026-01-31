import { validatePort } from "../../../shared/helpers.js";
import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type { TurnServerCredentials } from "../../../shared/types/TurnServerCredentials.js";
import { DEFAULT_TURN_SERVER_PORT } from "../../constants/serverConstants.js";
import type {
  ITurnServerManager,
  ILogger,
  TurnServerHandlers,
} from "../../contracts/index.js";

export class TurnServerManager implements ITurnServerManager {
  private status: ManagerStatus = "IDLE";
  private handlers: TurnServerHandlers | null = null;
  private _url: string = "";
  private _ip: string = "";
  private _port: number = DEFAULT_TURN_SERVER_PORT;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "TurnServerManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the TurnServerManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the TurnServerManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.status = "RUNNING";
  }

  setHandlers(handlers: TurnServerHandlers): void {
    this.handlers = handlers;
  }

  //Do more in depth port validation logic here if necessary
  setPortAndIp(port: number, ip: string): string {
    if (this.status === "RUNNING") {
      this.logger.error(
        `Cannot set the port and IP whilst status is ${this.status}`,
      );
      return this._url;
    }
    if (validatePort(port)) this._port = port;
    this._ip = ip;
    this.createUrl(this._port, this._ip);
    return this._url;
  }

  //Need to implement correct credential logic here:
  createServerCredentials(): TurnServerCredentials {
    if (this.status === "IDLE") {
      throw new Error(
        `Unable to create server credentials because the status is ${this.status}. Please initialize TurnServerManager before calling`,
      );
    }
    return {
      username: "intercom",
      credential: "abcdef",
    };
  }

  //Need to implement correct credential logic here:
  createClientCredentials(): TurnServerCredentials | null {
    const notRunning = this.checkAndWarnIfNotRunning(
      "create client credentials",
    );
    if (notRunning) return null;
    return { username: "client-test", credential: "client-test-credential" };
  }

  get url(): string {
    if (this.status === "IDLE") {
      throw new Error(
        `Unable to get the url because the status is ${this.status}. Please initialize TurnServerManager before calling`,
      );
    }
    return this._url;
  }

  get port(): number {
    if (this.status === "IDLE") {
      throw new Error(
        `Unable to get the port because the status is ${this.status}. Please initialize TurnServerManager before calling`,
      );
    }
    return this._port;
  }

  private createUrl(port: number, ip: string): void {
    this._url = `turn:${this._ip}:${this._port}`;
  }

  private get activeHandlers(): TurnServerHandlers {
    if (!this.handlers)
      throw new Error("TurnServerManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this.status}`,
      );
      return true;
    }
    return false;
  }
}
