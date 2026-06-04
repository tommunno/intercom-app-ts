import { useState, type ChangeEvent } from "react";
import { useLoggingInfo } from "../../hooks/index.js";
import type { LogRow } from "../../../../shared/types/index.js";
import { getPrettyTimestamp } from "../../../../shared/helpers.js";
import setupWss from "../../managers/setupWss.js";
import { LOG_PAGE_SIZE } from "../../../../shared/constants/sharedConstants.js";
import logger from "../../../shared/logging/logger.js";
import { downloadLogs } from "../../helpers/downloadLogs.js";
import {
  dataIsDownloadRange,
  type LogDownloadRange,
} from "../../types/index.js";
import { getDownloadLogFromTimestamp } from "../../helpers/index.js";
import { usePopup } from "../../hooks/usePopup.js";
import { LoggingRangeDialogBox } from "../overlays/LoggingRangeDialogBox.jsx";

const log = logger.child({ context: "LoggingSection" });

const mapLogs = (
  log: LogRow,
  selectedLog: LogRow | null,
  setSelectedLog: React.Dispatch<React.SetStateAction<LogRow | null>>,
) => (
  <div
    key={log.id}
    className={`log ${log.level.toLowerCase()}${selectedLog?.id === log.id ? " selected" : ""}`}
    onClick={() => setSelectedLog(log)}
  >
    <span className="log-type">{log.level}</span>
    <span className="log-date">
      {getPrettyTimestamp(new Date(log.createdAt))}
    </span>
    <span className="log-message">{log.message}</span>
  </div>
);

export function LoggingSection() {
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [{ latestLogs, requestedLogs }, setLoggingInfo] = useLoggingInfo();
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null);
  const { logs: reqLogs, position } = requestedLogs;
  const isShowingLatestLogs = reqLogs === null;
  const [downloadRange, setDownloadRange] = useState<LogDownloadRange>("1h");
  const [isPickingRange, setIsPickingRange] = useState<boolean>(false);
  const setPopupConfig = usePopup();

  function handlePrevPageClick(): void {
    const id: number | undefined = isShowingLatestLogs
      ? latestLogs.at(-1)?.id
      : reqLogs?.at(-1)?.id;
    if (id === undefined) return;
    setupWss.send("ADMIN_LOGS_PAGE_REQUEST", { direction: "BEFORE", id });
    setSelectedLog(null);
  }

  function handleNextPageClick(): void {
    setSelectedLog(null);
    const id: number | undefined = reqLogs?.[0]?.id;
    if (id === undefined) {
      setLoggingInfo((prev) => ({
        ...prev,
        requestedLogs: { logs: null, position: "BETWEEN" },
      }));
      return;
    }
    setupWss.send("ADMIN_LOGS_PAGE_REQUEST", { direction: "AFTER", id });
  }

  function handleDownloadRangeSelect(e: ChangeEvent<HTMLSelectElement>): void {
    const value = e.currentTarget.value;
    if (!dataIsDownloadRange(value)) {
      log.error(`Download range value ${value} is not of type DownloadRange`);
      return;
    }
    setDownloadRange(value);
  }

  async function handleDownloadLogsSubmit(
    e: React.SyntheticEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    if (downloadRange === "custom") {
      setIsPickingRange(true);
      return;
    }
    await handleLogsDownload(getDownloadLogFromTimestamp(downloadRange), null);
  }

  async function handleLogsDownload(
    from: number | null,
    to: number | null,
  ): Promise<void> {
    const result = await downloadLogs(from, to);
    if (!result.success) {
      log.error(`Error downloading logs: ${result.message}`);
      setPopupConfig({
        isVisible: true,
        type: "error",
        title: "Error downloading logs",
        message: result.message,
      });
      return;
    }
    setPopupConfig({
      isVisible: true,
      type: "success",
      title: "Log download started",
      message: "",
    });
  }

  return (
    <div className={`logging-section section${isHidden ? " hidden" : ""}`}>
      <h2
        className="logging-section-title section-title"
        onClick={() => setIsHidden((h) => !h)}
      >
        Logging: <span className="expanding-arrow closed">&#9660;</span>
        <span className="expanding-arrow open">&#9650;</span>
      </h2>
      <div className="logging-window-container">
        <div className="logging-window">
          <div className="logging-btn-bar">
            <div className="logging-nav">
              <button
                className="logging-bar-btn prev btn"
                onClick={handlePrevPageClick}
                disabled={
                  isShowingLatestLogs
                    ? latestLogs.length < LOG_PAGE_SIZE
                    : !reqLogs || reqLogs.length === 0 || position === "OLDEST"
                }
              >
                ← Previous Page
              </button>
              <button
                className="logging-bar-btn next btn"
                onClick={handleNextPageClick}
                disabled={isShowingLatestLogs}
              >
                Next Page →
              </button>
            </div>
            <form
              className="download-logs-form"
              onSubmit={handleDownloadLogsSubmit}
            >
              <select
                className="download-logs-range-select"
                name="range-select"
                value={downloadRange}
                onChange={handleDownloadRangeSelect}
              >
                <option value="1h">Last hour</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="all">All logs</option>
                <option value="custom">Custom range...</option>
              </select>
              <button className="logging-bar-btn download-logs btn">
                Download Logs
              </button>
            </form>
          </div>
          <div className="logging-space">
            {isShowingLatestLogs
              ? latestLogs.map((log) =>
                  mapLogs(log, selectedLog, setSelectedLog),
                )
              : reqLogs
                ? reqLogs.map((log) =>
                    mapLogs(log, selectedLog, setSelectedLog),
                  )
                : null}
          </div>
          <div
            className={`log-detail log ${selectedLog ? selectedLog.level.toLowerCase() : "success empty"}`}
          >
            <div className="log-detail-header">
              <span className="log-type">
                {selectedLog ? selectedLog.level : "LEVEL"}
              </span>
              <span className="log-date">
                {selectedLog
                  ? getPrettyTimestamp(new Date(selectedLog.createdAt))
                  : "DATE"}
              </span>
              {selectedLog && (
                <span className="log-context">{selectedLog.context}</span>
              )}
            </div>
            <pre className="log-detail-message">
              {selectedLog
                ? selectedLog.message
                : "No log selected. Click a log to see more details."}
            </pre>
          </div>
        </div>
      </div>
      {isPickingRange && (
        <LoggingRangeDialogBox
          onDownload={(from, to) => {
            handleLogsDownload(from, to);
            setIsPickingRange(false);
          }}
          onCancel={() => setIsPickingRange(false)}
        />
      )}
    </div>
  );
}
