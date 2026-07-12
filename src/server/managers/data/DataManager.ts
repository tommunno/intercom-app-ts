import type {
  LogLevel,
  LogRow,
  LogRowsInfo,
  ManagerStatus,
} from "../../../shared/types/index.js";
import type {
  DataManagerHandlers,
  GetLogsParams,
  IDataManager,
  ILogger,
} from "../../contracts/index.js";
import {
  type DataKey,
  type DataPayloadMap,
  type NetworkPopulateData,
  type WebServerData,
  type TurnServerData,
  DATA_PAYLOAD_VALIDATORS,
  type DownloadLogsOptions,
  type DownloadLogsResult,
  type DbStatements,
} from "../../types/index.js";
//Constants:
import {
  ADMIN_LOG_UPDATE_INTERVAL_MS,
  DATABASE_BACKUP_INTERVAL_MS,
  LOGS_BETWEEN_PRUNES,
  MAX_DATABASE_BACKUPS,
  MAX_LOG_EXPORT_ROWS,
  MAX_LOG_ROWS,
} from "../../constants/serverConstants.js";
import {
  APP_NAME,
  LOG_PAGE_SIZE,
} from "../../../shared/constants/sharedConstants.js";
//External:
import path from "node:path";
import fs from "node:fs";
import "dotenv/config";
import Database from "better-sqlite3";
import { getPrettyTimestamp } from "../../../shared/helpers.js";
import { runMigrations } from "../../database/runMigrations.js";
import { validateDatabase } from "../../database/validateDatabase.js";

export class DataManager implements IDataManager {
  private status: ManagerStatus = "IDLE";
  private handlers: DataManagerHandlers | null = null;
  private db: Database.Database | null = null;
  private dbStatements: DbStatements | null = null;
  private logsInsertedSincePrune: number = 0;
  private logQueue: {
    level: LogLevel;
    message: string;
    toAdminPanel: 0 | 1;
    context: string;
    createdAt: number;
  }[] = [];
  private adminLogUpdateTimeout: NodeJS.Timeout | null = null;
  private startupLogId: number = 1;
  private dbPath: string | null = null;
  private databaseBackupInterval: NodeJS.Timeout | null = null;
  private databaseBackupInProgress = false;

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
    this.queueStartupLog();
    this.drainLogQueue();
    this.pruneOldLogs();
    this.startAutomaticDatabaseBackups();
  }

  setHandlers(handlers: DataManagerHandlers): void {
    this.handlers = handlers;
  }

  saveData<K extends DataKey>(key: K, data: DataPayloadMap[K]): void {
    const action = `save data with key ${key}`;
    if (this.checkAndWarnIfNotRunning(action)) {
      return;
    }
    if (this.dbStatements === null) {
      this.logger.error(`Unable to ${action}: dbStatements is null`, true);
      return;
    }
    let json: string;
    try {
      json = JSON.stringify(data);
      this.dbStatements.upsertData.run(key, json, Date.now());
    } catch (err) {
      this.logger.error(`Unable to ${action}: ${err}`, true);
      return;
    }
  }

  loadData<K extends DataKey>(
    key: K,
    fallback: DataPayloadMap[K],
  ): DataPayloadMap[K] {
    const action = `load data with key ${key}`;
    if (this.checkAndWarnIfNotRunning(action)) {
      return fallback;
    }
    if (this.dbStatements === null) {
      this.logger.error(`Unable to ${action}: dbStatements is null`, true);
      return fallback;
    }
    let result: { json: string } | undefined;
    try {
      result = this.dbStatements.getData.get(key);
    } catch (err) {
      this.logger.error(`Unable to ${action}: ${err}`, true);
      return fallback;
    }
    if (!result) {
      this.logger.warn(`Unable to ${action}: no data found`, true);
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
      this.logger.error(`Unable to ${action}: data is invalid: ${err}`, true);
      return fallback;
    }
  }

  getNetworkData(): NetworkPopulateData {
    if (this.checkAndWarnIfNotRunning("get network data")) {
      return { webServerData: {}, turnServerData: {} };
    }

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

  insertLog(
    level: LogLevel,
    message: string,
    toAdminPanel: boolean,
    context: string,
  ): void {
    const createdAt = Date.now();
    const toAdminPanelNum = toAdminPanel ? 1 : 0;

    if (this.status !== "RUNNING" || this.dbStatements === null) {
      this.logQueue.push({
        level,
        message,
        toAdminPanel: toAdminPanelNum,
        createdAt,
        context,
      });
      return;
    }

    try {
      this.dbStatements.insertLog.run(
        level,
        message,
        toAdminPanelNum,
        context,
        createdAt,
      );
      this.logsInsertedSincePrune++;
      if (this.logsInsertedSincePrune >= LOGS_BETWEEN_PRUNES) {
        this.pruneOldLogs();
      }
      if (toAdminPanel) {
        this.scheduleAdminLogUpdate();
      }
    } catch (error) {
      //console.error instead of this.logger.error so as not to cause a loop:
      console.error(`[DataManager]: Unable to insert log`, error);
    }
  }

  getLogs(params: GetLogsParams): LogRowsInfo {
    const noLogsFound: LogRowsInfo = { logs: null, position: "BETWEEN" };
    if (this.checkAndWarnIfNotRunning("get logs")) {
      return noLogsFound;
    }
    if (this.dbStatements === null) {
      this.logger.error(`Unable to get logs: dbStatements is null`, true);
      return noLogsFound;
    }

    if (params.direction === "BEFORE") {
      try {
        const logs = this.dbStatements.getLogsBeforeId.all(
          params.id,
          this.startupLogId,
        );
        if (logs.length === 0) {
          return noLogsFound;
        }
        const isOldest = logs.length <= LOG_PAGE_SIZE;
        return {
          logs: logs.slice(0, LOG_PAGE_SIZE),
          position: isOldest ? "OLDEST" : "BETWEEN",
        };
      } catch (err) {
        this.logger.error(`Unable to get logs before ID: ${err}`, true);
        return noLogsFound;
      }
    }
    //AFTER:
    try {
      const logs = this.dbStatements.getLogsAfterId.all(params.id);
      if (logs.length === 0) {
        return noLogsFound;
      }
      const isLatest = logs.length <= LOG_PAGE_SIZE;
      return {
        logs: logs.slice(0, LOG_PAGE_SIZE).reverse(),
        position: isLatest ? "LATEST" : "BETWEEN",
      };
    } catch (err) {
      this.logger.error(`Unable to get logs after ID: ${err}`, true);
      return noLogsFound;
    }
  }

  getLatestLogs(): LogRow[] {
    if (this.status !== "RUNNING") {
      //console.error instead of this.logger.error so as not to cause a loop:
      console.error(
        `Unable to get latest logs because the status is ${this.status}`,
      );
      return [];
    }
    if (this.dbStatements === null) {
      console.error(`Unable to get latest logs: dbStatements is null`);
      return [];
    }
    try {
      return this.dbStatements.getLatestLogs.all(this.startupLogId);
    } catch (err) {
      console.error(`Unable to get latest logs: ${err}`);
      return [];
    }
  }

  downloadLogs({ from, to }: DownloadLogsOptions): DownloadLogsResult {
    const serverError: DownloadLogsResult = {
      success: false,
      statusCode: 500,
      message: "Internal server error",
    };
    if (this.checkAndWarnIfNotRunning("download logs")) {
      return serverError;
    }
    if (this.dbStatements === null) {
      this.logger.error(`Unable to get logs: dbStatements is null`);
      return serverError;
    }

    if (from !== null && to !== null && from > to) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid log date range: from is after to",
      };
    }

    const logs =
      to !== null
        ? this.dbStatements.getAllLogsBetweenTimes.all(from ?? 0, to)
        : this.dbStatements.getAllLogsAfterTime.all(from ?? 0);

    if (logs.length === 0) {
      return {
        success: false,
        statusCode: 404,
        message: "No logs found",
      };
    }
    const areLogsTruncated = logs.length === MAX_LOG_EXPORT_ROWS + 1;

    return {
      success: true,
      logText: this.createLogsText(
        logs.slice(0, MAX_LOG_EXPORT_ROWS),
        areLogsTruncated,
      ),
      filename: "logs.txt",
    };
  }

  //This assumes the first log in the queue is the startup log:
  private drainLogQueue(): void {
    if (this.dbStatements === null) {
      console.error(
        `[DataManager]: Unable to drain log queue: dbStatements is null`,
      );
      return;
    }
    let i = 0;
    for (const entry of this.logQueue) {
      try {
        const { lastInsertRowid } = this.dbStatements.insertLog.run(
          entry.level,
          entry.message,
          entry.toAdminPanel,
          entry.context,
          entry.createdAt,
        );
        this.logsInsertedSincePrune++;
        if (i === 0) {
          this.startupLogId = Number(lastInsertRowid);
        }
      } catch (error) {
        //console.error instead of this.logger.error so as not to cause a loop:
        console.error(`[DataManager]: Unable to insert log`, error);
      }
      i++;
    }
    const shouldUpdateAdminPanel = this.logQueue.some(
      (entry) => entry.toAdminPanel === 1,
    );
    if (shouldUpdateAdminPanel) {
      this.scheduleAdminLogUpdate();
    }
    this.logQueue.length = 0;
  }

  private get activeHandlers(): DataManagerHandlers {
    if (!this.handlers)
      throw new Error("DataManager handlers not initialized!");
    return this.handlers;
  }

  private ensureDatabase(): void {
    const dataDir = path.join(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    this.dbPath = path.join(dataDir, "app.db");

    this.db = new Database(this.dbPath);
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("journal_mode = WAL");
    runMigrations(this.db);
    validateDatabase(this.db);

    this.dbStatements = {
      upsertData: this.db.prepare(`
      INSERT INTO app_state (key, json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        json = excluded.json,
        updated_at = excluded.updated_at;
    `),
      getData: this.db.prepare(`
      SELECT json
      FROM app_state
      WHERE key = ?
    `),
      insertLog: this.db.prepare(`
      INSERT INTO logs (level, message, to_admin_panel, context, created_at)
      VALUES (?, ?, ?, ?, ?)
    `),
      getLatestLogs: this.db.prepare(`
      SELECT
        id,
        level,
        message,
        context,
        created_at AS createdAt
      FROM logs
      WHERE to_admin_panel = 1
      AND id >= ?
      ORDER BY id DESC
      LIMIT ${LOG_PAGE_SIZE}
    `),
      // Fetch one extra row (LOG_PAGE_SIZE + 1) so we can tell whether another page of logs exists.
      // The extra row should only be used for pagination state, not displayed.
      getLogsBeforeId: this.db.prepare(`
      SELECT
        id,
        level,
        message,
        context,
        created_at AS createdAt
      FROM logs
      WHERE to_admin_panel = 1
      AND id < ?
      AND id >= ?
      ORDER BY id DESC
      LIMIT ${LOG_PAGE_SIZE + 1}
    `),
      getLogsAfterId: this.db.prepare(`
      SELECT
        id,
        level,
        message,
        context,
        created_at AS createdAt
      FROM logs
      WHERE to_admin_panel = 1
      AND id > ?
      ORDER BY id ASC
      LIMIT ${LOG_PAGE_SIZE + 1}
    `),
      deleteOldLogs: this.db.prepare(`
      DELETE FROM logs
      WHERE id NOT IN (
        SELECT id
        FROM logs
        ORDER BY id DESC
        LIMIT ?
      )
    `),
      getAllLogsBetweenTimes: this.db.prepare(`
       SELECT
        id,
        level,
        message,
        context,
        created_at AS createdAt
      FROM logs
      WHERE created_at >= ?
      AND created_at <= ?
      ORDER BY id ASC
      LIMIT ${MAX_LOG_EXPORT_ROWS + 1}
    `),
      getAllLogsAfterTime: this.db.prepare(`
       SELECT
        id,
        level,
        message,
        context,
        created_at AS createdAt
      FROM logs
      WHERE created_at >= ?
      ORDER BY id ASC
      LIMIT ${MAX_LOG_EXPORT_ROWS + 1}
    `),
    };
  }

  private queueStartupLog(): void {
    this.logQueue.unshift({
      level: "INFO",
      message: "Application started",
      toAdminPanel: 1,
      context: "DataManager",
      createdAt: Date.now(),
    });
  }

  private pruneOldLogs(): void {
    //console.error so as not to cause infinite loop:
    if (this.dbStatements === null) {
      console.error("Unable to prune old logs: dbStatements is null");
      return;
    }
    try {
      this.dbStatements.deleteOldLogs.run(MAX_LOG_ROWS);
      this.logsInsertedSincePrune = 0;
    } catch (err) {
      console.error(`Unable to prune old logs: ${err}`);
    }
  }

  private scheduleAdminLogUpdate(): void {
    if (this.adminLogUpdateTimeout !== null) {
      return;
    }
    this.adminLogUpdateTimeout = setTimeout(() => {
      this.adminLogUpdateTimeout = null;
      this.activeHandlers.onAdminLogUpdate(this.getLatestLogs());
    }, ADMIN_LOG_UPDATE_INTERVAL_MS);
  }

  private createLogsText(logs: LogRow[], areLogsTruncated: boolean): string {
    const header = [
      `${APP_NAME} Log Export`,
      `Generated: ${getPrettyTimestamp(new Date())}`,
      `Rows: ${logs.length}${areLogsTruncated ? " (maximum export limit reached)" : ""}`,
      "",
    ].join("\n");
    const body = logs
      .map((log) => {
        const timestamp = getPrettyTimestamp(new Date(log.createdAt));
        return `[${timestamp}] [${log.level}] [${log.context}] ${log.message}`;
      })
      .join("\n\n");
    return `${header}${body}`;
  }

  private startAutomaticDatabaseBackups(): void {
    if (this.databaseBackupInterval !== null) {
      return;
    }

    // Make one backup on startup.
    void this.createDatabaseBackup();

    this.databaseBackupInterval = setInterval(() => {
      void this.createDatabaseBackup();
    }, DATABASE_BACKUP_INTERVAL_MS);
  }

  private async createDatabaseBackup(): Promise<void> {
    if (this.databaseBackupInProgress) {
      this.logger.warn(
        "Skipping database backup because another backup is already running",
      );
      return;
    }

    if (this.db === null || this.dbPath === null) {
      this.logger.error(
        "Unable to create database backup: database is not initialized",
        true,
      );
      return;
    }

    this.databaseBackupInProgress = true;

    const backupDirectory = path.join(path.dirname(this.dbPath), "backups");
    fs.mkdirSync(backupDirectory, { recursive: true });

    const timestamp = new Date()
      .toISOString()
      .replaceAll(":", "-")
      .replace(/\.\d{3}Z$/, "Z");

    const backupPath = path.join(backupDirectory, `app-${timestamp}.db`);

    try {
      await this.db.backup(backupPath);
      this.deleteOldDatabaseBackups(backupDirectory);

      this.logger.info(`Database backup created: ${path.basename(backupPath)}`);
    } catch (err) {
      // Remove a partially created destination, if one exists.
      try {
        fs.rmSync(backupPath, { force: true });
      } catch {
        // Nothing useful to do here.
      }

      this.logger.error(`Unable to create database backup: ${err}`, true);
    } finally {
      this.databaseBackupInProgress = false;
    }
  }

  private deleteOldDatabaseBackups(backupDirectory: string): void {
    try {
      const backups = fs
        .readdirSync(backupDirectory, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.startsWith("app-") &&
            entry.name.endsWith(".db"),
        )
        .map((entry) => {
          const fullPath = path.join(backupDirectory, entry.name);

          return {
            fullPath,
            modifiedAt: fs.statSync(fullPath).mtimeMs,
          };
        })
        .sort((a, b) => b.modifiedAt - a.modifiedAt);

      for (const backup of backups.slice(MAX_DATABASE_BACKUPS)) {
        fs.rmSync(backup.fullPath);
      }
    } catch (err) {
      this.logger.error(`Unable to prune old database backups: ${err}`, true);
    }
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
        true,
      );
      return true;
    }
    return false;
  }
}
