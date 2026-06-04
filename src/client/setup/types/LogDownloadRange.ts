export const LOG_DOWNLOAD_RANGES = [
  "1h",
  "24h",
  "7d",
  "all",
  "custom",
] as const;

export type LogDownloadRange = (typeof LOG_DOWNLOAD_RANGES)[number];

export type LogPresetDownloadRange = Exclude<LogDownloadRange, "custom">;

export function dataIsDownloadRange(value: unknown): value is LogDownloadRange {
  return LOG_DOWNLOAD_RANGES.some((range) => range === value);
}
