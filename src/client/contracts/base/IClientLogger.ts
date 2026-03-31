export interface ChildClientLoggerOptions {
  context: string;
}

export interface IClientLogger {
  success: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  child: (options: ChildClientLoggerOptions) => IClientLogger;
}
