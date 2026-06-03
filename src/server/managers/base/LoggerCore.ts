import type { LogLevel } from "../../../shared/types/index.js";
import type { LogHandler } from "../../contracts/index.js";

export class LoggerCore {
  private handlers: LogHandler[] = [];

  addHandler(handler: LogHandler): void {
    this.handlers.push(handler);
  }

  emit(
    level: LogLevel,
    message: string,
    toAdminPanel: boolean,
    context: string,
  ): void {
    for (const handler of this.handlers) {
      handler(level, message, toAdminPanel, context);
    }
  }
}
