//Types:
import { CONSOLE_LOGGING_ENABLED } from "../../constants/serverConstants.js";
import type {
  ILogger,
  ChildLoggerOptions,
  LogHandler,
} from "../../contracts/index.js";
import { LoggerCore } from "./LoggerCore.js";
//External libraries:
import chalk from "chalk";

export class Logger implements ILogger {
  private context: string = "";
  private prefix: string = "";
  constructor(
    private childOptions?: ChildLoggerOptions,
    private core: LoggerCore = new LoggerCore(),
  ) {
    this.context = this.childOptions?.context ?? "";
    this.prefix = this.context ? `[${this.context}] ` : "";
  }

  success(message: string, toAdminPanel = false, data?: unknown): void {
    if (CONSOLE_LOGGING_ENABLED) {
      console.log(`${this.prefix}${chalk.green.bold("SUCCESS:")} ${message}`);
      if (data !== undefined) console.log(data);
    }
    this.core.emit(
      "SUCCESS",
      this.createMessage(message, data),
      toAdminPanel,
      this.context,
    );
  }
  warn(message: string, toAdminPanel = false, data?: unknown): void {
    if (CONSOLE_LOGGING_ENABLED) {
      console.warn(`${this.prefix}${chalk.yellow.bold("WARN:")} ${message}`);
      if (data !== undefined) console.log(data);
    }
    this.core.emit(
      "WARNING",
      this.createMessage(message, data),
      toAdminPanel,
      this.context,
    );
  }
  error(message: string, toAdminPanel = false, error?: unknown): void {
    const errorMessage =
      error !== undefined ? ": " + this.getErrorMessage(error) : "";
    if (CONSOLE_LOGGING_ENABLED) {
      console.error(
        `${this.prefix}${chalk.red.bold("ERROR:")} ${message}${errorMessage}`,
      );
    }
    this.core.emit(
      "ERROR",
      `${message}${errorMessage}`,
      toAdminPanel,
      this.context,
    );
  }
  info(message: string, toAdminPanel = false, data?: unknown): void {
    if (CONSOLE_LOGGING_ENABLED) {
      console.log(
        `${this.prefix}${chalk.hex("#007FFF").bold("INFO:")} ${message}`,
      );
      if (data !== undefined) console.log(data);
    }
    this.core.emit(
      "INFO",
      this.createMessage(message, data),
      toAdminPanel,
      this.context,
    );
  }
  child(options: ChildLoggerOptions): ILogger {
    return new Logger(options, this.core);
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error !== null) {
      try {
        return JSON.stringify(error, null, 2);
      } catch {
        return "Unknown error object";
      }
    }
    try {
      return String(error);
    } catch {
      return "Unknown error";
    }
  }

  onLog(handler: LogHandler): void {
    this.core.addHandler(handler);
  }

  private createMessage(message: string, data: unknown): string {
    let dataString: string | null = null;
    if (data !== undefined) {
      try {
        dataString = JSON.stringify(data, null, 2);
      } catch {
        this.core.emit(
          "ERROR",
          `Unable to stringify log data for message: ${message}`,
          true,
          this.context,
        );
      }
    }
    return `${message}${dataString === null ? "" : `:\n${dataString}`}`;
  }
}
