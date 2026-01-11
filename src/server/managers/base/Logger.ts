import type { ILogger, ChildLoggerOptions } from "../../contracts/index.js";

export class Logger implements ILogger {
  private prefix: string = "";
  constructor(private childOptions?: ChildLoggerOptions) {
    this.prefix = this.childOptions?.context
      ? `[${this.childOptions.context}] `
      : "";
  }

  success(message: string): void {
    console.log(`${this.prefix}SUCCESS: ${message}`);
  }
  warn(message: string): void {
    console.warn(`${this.prefix}WARN: ${message}`);
  }
  error(message: string, error?: unknown): void {
    const errorMessage = error ? ": " + this.getErrorMessage(error) : "";
    console.error(`${this.prefix}ERROR: ${message}${errorMessage}`);
  }
  info(message: string): void {
    console.log(`${this.prefix}INFO: ${message}`);
  }
  child(options: ChildLoggerOptions): ILogger {
    return new Logger(options);
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
