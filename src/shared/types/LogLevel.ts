export type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export function dataIsLogLevel(data: unknown): data is LogLevel {
  return (
    data === "INFO" ||
    data === "SUCCESS" ||
    data === "WARNING" ||
    data === "ERROR"
  );
}
