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
    console.log(`${this.prefix}WARN: ${message}`);
  }
  error(message: string): void {
    console.log(`${this.prefix}ERROR: ${message}`);
  }
  info(message: string): void {
    console.log(`${this.prefix}INFO: ${message}`);
  }
  child(options: ChildLoggerOptions): ILogger {
    return new Logger(options);
  }
}
