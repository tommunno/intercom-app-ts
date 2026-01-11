export function isStringAndNotEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function validatePort(port: number) {
  return (
    Number.isInteger(port) &&
    (port >= 1025 || port === 80 || port === 443) &&
    port <= 65535
  );
}
