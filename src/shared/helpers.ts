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

export function isAddressLocalhost(address: string | undefined) {
  return (
    address === "127.0.0.1" ||
    address === "::1" ||
    address === "::ffff:127.0.0.1"
  );
}
