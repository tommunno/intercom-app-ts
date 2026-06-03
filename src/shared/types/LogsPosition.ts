export type LogsPosition = "OLDEST" | "BETWEEN" | "LATEST";

export function dataIsLogsPosition(data: unknown): data is LogsPosition {
  return data === "OLDEST" || data === "BETWEEN" || data === "LATEST";
}
