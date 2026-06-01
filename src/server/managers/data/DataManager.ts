import type { ManagerStatus } from "../../../shared/types/index.js";
import type {
  DataManagerHandlers,
  IDataManager,
  ILogger,
} from "../../contracts/index.js";
import {
  type DataKey,
  type DataPayloadMap,
  type UpsertDataStatement,
  type GetDataStatement,
  type NetworkPopulateData,
  type WebServerData,
  type TurnServerData,
  DATA_PAYLOAD_VALIDATORS,
} from "../../types/index.js";
//External:
import path from "node:path";
import fs from "node:fs";
import "dotenv/config";
import Database from "better-sqlite3";

export class DataManager implements IDataManager {
  private status: ManagerStatus = "IDLE";
  private handlers: DataManagerHandlers | null = null;
  private db: Database.Database | null = null;
  private upsertData: UpsertDataStatement | null = null;
  private getData: GetDataStatement | null = null;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "DataManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the DataManager whilst its status is ${this.status}`,
      );
    }
    this.ensureDatabase();
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

  saveData<K extends DataKey>(key: K, data: DataPayloadMap[K]): void {
    const action = `save data with key ${key}`;
    if (this.checkAndWarnIfNotRunning(action)) {
      return;
    }
    if (this.upsertData === null) {
      this.logger.error(`Unable to ${action}: upsertData is null`);
      return;
    }
    let json: string;
    try {
      json = JSON.stringify(data);
    } catch (err) {
      this.logger.error(`Unable to ${action}: ${err}`);
      return;
    }
    this.upsertData.run(key, json, Date.now());
  }

  loadData<K extends DataKey>(
    key: K,
    fallback: DataPayloadMap[K],
  ): DataPayloadMap[K] {
    const action = `load data with key ${key}`;
    if (this.checkAndWarnIfNotRunning(action)) {
      return fallback;
    }
    if (this.getData === null) {
      this.logger.error(`Unable to ${action}: getData is null`);
      return fallback;
    }
    const result = this.getData.get(key);
    if (!result) {
      this.logger.warn(`Unable to ${action}: no data found`);
      return fallback;
    }
    try {
      const data: unknown = JSON.parse(result.json);
      const validator = DATA_PAYLOAD_VALIDATORS[key];
      if (!validator(data)) {
        throw new Error(
          `the data does not match expected shape for key ${key}`,
        );
      }
      return data;
    } catch (err) {
      this.logger.error(`Unable to ${action}: data is invalid: ${err}`);
      return fallback;
    }
  }

  getNetworkData(): NetworkPopulateData {
    const networkData = this.loadData("NETWORK", {});
    //Port validation takes place in NetworkController
    const httpEnv = process.env.INTERCOM_HTTP_PORT;
    const httpsEnv = process.env.INTERCOM_HTTPS_PORT;
    const turnEnv = process.env.INTERCOM_TURN_PORT;

    const webServerData: WebServerData = {};
    const turnServerData: TurnServerData = {};

    if (httpEnv !== undefined) webServerData.httpPort = Number(httpEnv);
    if (httpsEnv !== undefined) webServerData.httpsPort = Number(httpsEnv);
    if (turnEnv !== undefined) turnServerData.port = Number(turnEnv);
    if (networkData.turnServerIp !== undefined)
      turnServerData.ip = networkData.turnServerIp;
    return {
      turnServerData,
      webServerData,
    };
  }

  private get activeHandlers(): DataManagerHandlers {
    if (!this.handlers)
      throw new Error("DataManager handlers not initialized!");
    return this.handlers;
  }

  private ensureDatabase(): void {
    const dataDir = path.join(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "app.db");

    this.db = new Database(dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )      
    `);

    this.upsertData = this.db.prepare(`
      INSERT INTO app_state (key, json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        json = excluded.json,
        updated_at = excluded.updated_at;
    `);

    this.getData = this.db.prepare(`
      SELECT json
      FROM app_state
      WHERE key = ?
    `);
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
