//Types:
import type { ILogger, ChildLoggerOptions } from "../../contracts/index.js";
//External libraries:
import chalk from "chalk";

export class Logger implements ILogger {
  private prefix: string = "";
  constructor(private childOptions?: ChildLoggerOptions) {
    this.prefix = this.childOptions?.context
      ? `[${this.childOptions.context}] `
      : "";
  }

  success(message: string, data?: any): void {
    console.log(`${this.prefix}${chalk.green.bold("SUCCESS:")} ${message}`);
    if (data) console.log(data);
  }
  warn(message: string, data?: any): void {
    console.warn(`${this.prefix}${chalk.yellow.bold("WARN:")} ${message}`);
    if (data) console.log(data);
  }
  error(message: string, error?: unknown): void {
    const errorMessage = error ? ": " + this.getErrorMessage(error) : "";
    console.error(
      `${this.prefix}${chalk.red.bold("ERROR:")} ${message}${errorMessage}`,
    );
  }
  info(message: string, data?: any): void {
    console.log(
      `${this.prefix}${chalk.hex("#007FFF").bold("INFO:")} ${message}`,
    );
    if (data) console.log(data);
  }
  child(options: ChildLoggerOptions): ILogger {
    return new Logger(options);
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
