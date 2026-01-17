export interface ChildLoggerOptions {
  context: string;
}

export interface ILogger {
  success: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: unknown) => void;
  info: (message: string, data?: any) => void;
  child: (options: ChildLoggerOptions) => ILogger;
}
