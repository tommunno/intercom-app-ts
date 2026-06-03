import type { ManagerStatus } from "../../../shared/types/ManagerStatus.js";
import type { TurnServerCredentials } from "../../../shared/types/TurnServerCredentials.js";
import { DEFAULT_TURN_SERVER_IP } from "../../constants/serverConstants.js";
import type {
  ITurnServerManager,
  ILogger,
  TurnServerHandlers,
  TurnServerAdminInfo,
  TurnServerSaveSnapshot,
} from "../../contracts/index.js";
import type { TurnServerResolvedData } from "../../types/NetworkData.js";

export class TurnServerManager implements ITurnServerManager {
  private _status: ManagerStatus = "IDLE";
  private handlers: TurnServerHandlers | null = null;
  private _port: number | null = null;
  private _ip: string = DEFAULT_TURN_SERVER_IP;
  private _url: string = "";
  private _isOnline: boolean = false;
  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "TurnServerManager" });
  }

  init(): TurnServerCredentials {
    if (this._status !== "IDLE") {
      throw new Error(
        `Cannot initialize the TurnServerManager whilst its status is ${this._status}`,
      );
    }
    this._status = "INITIALIZED";
    return this.createServerCredentials();
  }

  populate({ port, ip }: TurnServerResolvedData): string {
    if (this._status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the TurnServerManager whilst its status is ${this._status}`,
      );
    }
    this.setPortAndIp(port, ip);
    this._status = "POPULATED";
    return this._url;
  }

  start(): void {
    if (this._status !== "POPULATED") {
      throw new Error(
        `Cannot start the TurnServerManager whilst its status is ${this._status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this._status = "RUNNING";
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

  //Todo: fill in ipv4Interfaces here:
  getAdminInfo(): TurnServerAdminInfo {
    return {
      turnServerPort: this._port,
      isTurnServerOnline: this._isOnline,
      ipv4Interfaces: {},
    };
  }

  getSaveSnapshot(): TurnServerSaveSnapshot | null {
    const notRunning = this.checkAndWarnIfNotRunning("get save snapshot");
    if (notRunning) return null;
    return { ip: this._ip };
  }

  get status(): ManagerStatus {
    return this._status;
  }

  get port(): number | null {
    if (this._status === "IDLE" || this._status === "INITIALIZED") {
      this.logger.warn(
        `get port: status is ${this._status}; port may not be initialized yet`,
        true,
      );
    }
    return this._port;
  }

  //Need to implement correct credential logic here:
  private createServerCredentials(): TurnServerCredentials {
    return {
      username: "intercom",
      credential: "abcdef",
    };
  }

  //Do more in depth IP validation here if necessary:
  private setPortAndIp(port: number, ip?: string) {
    //Port is validated in NetworkController:
    this._port = port;
    if (ip) {
      this._ip = ip;
    } else {
      this.logger.warn(
        `No TURN IP provided. Will use default IP ${DEFAULT_TURN_SERVER_IP}`,
        true,
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
    if (this._status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this._status}`,
        true,
      );
      return true;
    }
    return false;
  }
}
