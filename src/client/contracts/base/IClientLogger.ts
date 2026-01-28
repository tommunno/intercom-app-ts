export interface ChildClientLoggerOptions {
  context: string;
}

export interface IClientLogger {
  success: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: unknown) => void;
  info: (message: string, data?: any) => void;
  child: (options: ChildClientLoggerOptions) => IClientLogger;
}
