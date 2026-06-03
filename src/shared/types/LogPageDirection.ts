export type LogPageDirection = "BEFORE" | "AFTER";

export function dataIsLogPageDirection(
  data: unknown,
): data is LogPageDirection {
  return data === "BEFORE" || data === "AFTER";
}
