export interface ChildLoggerOptions {
  context: string;
}

export interface ILogger {
  success(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
  info(message: string): void;
  child(options: ChildLoggerOptions): ILogger;
}
