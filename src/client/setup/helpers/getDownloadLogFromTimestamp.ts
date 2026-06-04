import type { LogPresetDownloadRange } from "../types/LogDownloadRange.js";

export function getDownloadLogFromTimestamp(
  range: LogPresetDownloadRange,
): number | null {
  const now = Date.now();
  switch (range) {
    case "1h":
      return now - 60 * 60 * 1000;
    case "24h":
      return now - 24 * 60 * 60 * 1000;
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "all":
      return null;
  }
}
