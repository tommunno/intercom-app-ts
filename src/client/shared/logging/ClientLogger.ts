import type {
  ChildClientLoggerOptions,
  IClientLogger,
} from "../contracts/index.js";

const COLORS = {
  success:
    "background: #1b4332; color: #74c69d; font-weight: bold; padding: 2px 4px; border-radius: 3px;",
  info: "background: #003566; color: #4cc9f0; font-weight: bold; padding: 2px 4px; border-radius: 3px;",
  warn: "background: #78290f; color: #ffb703; font-weight: bold; padding: 2px 4px; border-radius: 3px;",
  error:
    "background: #6a040f; color: #ff85a1; font-weight: bold; padding: 2px 4px; border-radius: 3px;",
  prefix: "color: #888; font-style: italic;", // The [Context] style
};

export class ClientLogger implements IClientLogger {
  private prefix: string = "";

  constructor(private childOptions?: ChildClientLoggerOptions) {
    this.prefix = this.childOptions?.context
      ? `%c[${this.childOptions.context}] `
      : "%c";
  }

  success(message: string, data?: unknown): void {
    console.log(
      `${this.prefix}%c SUCCESS %c ${message}`,
      COLORS.prefix,
      COLORS.success,
      "", // Reset style for the message body
    );
    if (data) console.log(data);
  }

  info(message: string, data?: unknown): void {
    console.log(
      `${this.prefix}%c INFO %c ${message}`,
      COLORS.prefix,
      COLORS.info,
      "",
    );
    if (data) console.log(data);
  }

  warn(message: string, data?: unknown): void {
    console.warn(
      `${this.prefix}%c WARN %c ${message}`,
      COLORS.prefix,
      COLORS.warn,
      "",
    );
    if (data) console.log(data);
  }

  error(message: string, error?: unknown): void {
    const errorMessage = error ? ": " + this.getErrorMessage(error) : "";
    console.error(
      `${this.prefix}%c ERROR %c ${message}${errorMessage}`,
      COLORS.prefix,
      COLORS.error,
      "",
    );
  }

  child(options: ChildClientLoggerOptions): IClientLogger {
    return new ClientLogger(options);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
