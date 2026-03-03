import type { ManagerStatus } from "../../../shared/types/index.js";
import type {
  DataManagerHandlers,
  IDataManager,
  ILogger,
} from "../../contracts/index.js";
import type { AccountData } from "../../types/AccountData.js";
import type { AdminAccountData } from "../../types/AdminAccountData.js";
import type { AudioData } from "../../types/AudioData.js";
import type { NetworkData } from "../../types/NetworkData.js";

export class DataManager implements IDataManager {
  private status: ManagerStatus = "IDLE";
  private handlers: DataManagerHandlers | null = null;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "DataManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the DataManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the DataManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.status = "RUNNING";
  }

  setHandlers(handlers: DataManagerHandlers): void {
    this.handlers = handlers;
  }

  getAccountData(): AccountData {
    this.checkAndWarnIfNotRunning("get account data", true);

    //Temporary data:
    return {
      numUsers: 3,
      persistedUsers: [
        {
          username: "tom",
          passwordHash: null,
          sessionTokenInfos: [],
        },
        {
          username: "ben",
          passwordHash: null,
          sessionTokenInfos: [
            {
              token: "abc",
              expiresAtMs: Date.now() + 7 * 24 * 60 * 60 * 1000,
            },
            {
              token: "def",
              expiresAtMs: Date.now() + 7 * 24 * 60 * 60 * 1000,
            },
          ],
        },
        {
          username: "luke",
          passwordHash: null,
          sessionTokenInfos: [
            {
              token: "ghi",
              expiresAtMs: Date.now() + 7 * 24 * 60 * 60 * 1000,
            },
          ],
        },
      ],
    };
  }

  getAdminAccountData(): AdminAccountData {
    this.checkAndWarnIfNotRunning("get admin account data", true);

    //Temporary data:
    return {};
  }

  getNetworkData(): NetworkData {
    this.checkAndWarnIfNotRunning("get network data", true);

    //Temporary data:
    return {
      webServerData: { httpPort: 5051, httpsPort: 5052 },
      turnServerData: { port: 4052, ip: "192.168.86.183" },
    };
  }

  getAudioData(): AudioData {
    this.checkAndWarnIfNotRunning("get audio data", true);

    //Temporary data:
    return {
      requestedNumSoundcardChannels: 4,
      numPartylines: 12,
      requestedSoundcardId: 4,
    };
  }

  private get activeHandlers(): DataManagerHandlers {
    if (!this.handlers)
      throw new Error("DataManager handlers not initialized!");
    return this.handlers;
  }

  private checkAndWarnIfNotRunning(
    action: string,
    throwErr: boolean = false,
  ): boolean {
    if (this.status !== "RUNNING") {
      const message = `Unable to ${action} because the status is ${this.status}`;
      if (throwErr) {
        throw new Error(message);
      }
      this.logger.error(
        `Unable to ${action} because the status is ${this.status}`,
      );
      return true;
    }
    return false;
  }
}
