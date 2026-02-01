import { validatePort } from "../../../shared/helpers.js";
import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type { TurnServerCredentials } from "../../../shared/types/TurnServerCredentials.js";
import {
  DEFAULT_TURN_SERVER_IP,
  DEFAULT_TURN_SERVER_PORT,
} from "../../constants/serverConstants.js";
import type {
  ITurnServerManager,
  ILogger,
  TurnServerHandlers,
} from "../../contracts/index.js";
import type { TurnServerData } from "../../types/NetworkData.js";

export class TurnServerManager implements ITurnServerManager {
  private status: ManagerStatus = "IDLE";
  private handlers: TurnServerHandlers | null = null;
  private _port: number = DEFAULT_TURN_SERVER_PORT;
  private _ip: string = DEFAULT_TURN_SERVER_IP;
  private _url: string = "";
  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "TurnServerManager" });
  }

  init(): TurnServerCredentials {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the TurnServerManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
    return this.createServerCredentials();
  }

  populate({ port, ip }: TurnServerData): string {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the TurnServerManager whilst its status is ${this.status}`,
      );
    }
    this.setPortAndIp(port, ip);
    this.status = "POPULATED";
    return this._url;
  }

  start(): void {
    if (this.status !== "POPULATED") {
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

  //Need to implement correct credential logic here:
  createClientCredentials(): TurnServerCredentials | null {
    const notRunning = this.checkAndWarnIfNotRunning(
      "create client credentials",
    );
    if (notRunning) return null;
    return { username: "client-test", credential: "client-test-credential" };
  }

  get port(): number {
    return this._port;
  }

  //Need to implement correct credential logic here:
  private createServerCredentials(): TurnServerCredentials {
    return {
      username: "intercom",
      credential: "abcdef",
    };
  }

  //Do more in depth port validation logic here if necessary
  private setPortAndIp(port?: number, ip?: string) {
    if (validatePort(port)) {
      this._port = port;
    } else {
      this.logger.warn(
        `Invalid port provided. Will use default port ${DEFAULT_TURN_SERVER_PORT}`,
      );
    }
    if (ip) {
      this._ip = ip;
    } else {
      this.logger.warn(
        `Invalid IP provided. Will use default IP ${DEFAULT_TURN_SERVER_IP}`,
      );
    }
    this.createUrl();
  }

  private createUrl(): void {
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
