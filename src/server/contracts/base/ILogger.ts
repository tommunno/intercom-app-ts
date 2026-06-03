import type { LogLevel } from "../../../shared/types/index.js";

export interface ChildLoggerOptions {
  context: string;
}

export type LogHandler = (
  level: LogLevel,
  message: string,
  toAdminPanel: boolean,
  context: string,
) => void;

export interface ILogger {
  success: (message: string, toAdminPanel?: boolean, data?: unknown) => void;
  warn: (message: string, toAdminPanel?: boolean, data?: unknown) => void;
  error: (message: string, toAdminPanel?: boolean, error?: unknown) => void;
  info: (message: string, toAdminPanel?: boolean, data?: unknown) => void;
  child: (options: ChildLoggerOptions) => ILogger;
  onLog: (handler: LogHandler) => void;
}
