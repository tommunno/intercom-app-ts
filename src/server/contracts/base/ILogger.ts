export interface ChildLoggerOptions {
  context: string;
}

export interface ILogger {
  success: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  child: (options: ChildLoggerOptions) => ILogger;
}
