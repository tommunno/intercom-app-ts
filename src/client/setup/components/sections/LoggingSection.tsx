import { useState } from "react";
import { useLoggingInfo } from "../../hooks/index.js";
import type { LogRow } from "../../../../shared/types/index.js";
import { getPrettyTimestamp } from "../../../../shared/helpers.js";
import setupWss from "../../managers/setupWss.js";
import { LOG_PAGE_SIZE } from "../../../../shared/constants/sharedConstants.js";

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

  return (
    <div className={`logging-section section${isHidden ? " hidden" : ""}`}>
      <h2
        className="logging-section-title section-title"
        onClick={() => setIsHidden((h) => !h)}
      >
        Logging: <span className="expanding-arrow closed">&#9660;</span>
        <span className="expanding-arrow open">&#9650;</span>
      </h2>
      <div className="logging-window">
        <div className="logging-btn-nav">
          <button
            className="logging-nav-btn prev btn"
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
            className="logging-nav-btn next btn"
            onClick={handleNextPageClick}
            disabled={isShowingLatestLogs}
          >
            Next Page →
          </button>
        </div>
        <div className="logging-space">
          {isShowingLatestLogs
            ? latestLogs.map((log) => mapLogs(log, selectedLog, setSelectedLog))
            : reqLogs
              ? reqLogs.map((log) => mapLogs(log, selectedLog, setSelectedLog))
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
  );
}
