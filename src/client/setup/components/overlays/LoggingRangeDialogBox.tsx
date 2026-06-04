import { useEffect, useRef, useState } from "react";
import {
  getDateTimeLocalFromDate,
  getTimestampFromDateTimeLocal,
} from "../../../../shared/helpers.js";
import logger from "../../../shared/logging/logger.js";

const log = logger.child({ context: "LoggingRangeDialogBox" });

interface LoggingRangeDialogBoxProps {
  onDownload: (from: number, to: number) => void;
  onCancel: () => void;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export function LoggingRangeDialogBox({
  onDownload,
  onCancel,
}: LoggingRangeDialogBoxProps) {
  //Defaults to an hour ago:
  const [from, setFrom] = useState<string>(() =>
    getDateTimeLocalFromDate(new Date(Date.now() - ONE_HOUR_MS)),
  );
  //Defaults to now:
  const [to, setTo] = useState<string>(() =>
    getDateTimeLocalFromDate(new Date()),
  );
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const fromTimestamp = getTimestampFromDateTimeLocal(from);
  const toTimestamp = getTimestampFromDateTimeLocal(to);
  const invalidRange =
    fromTimestamp === null ||
    toTimestamp === null ||
    fromTimestamp > toTimestamp;

  //Focus cancel button on mount:
  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  function handleDownload(): void {
    if (fromTimestamp === null || toTimestamp === null) {
      log.error(
        `handleDownload: invalid timestamps: fromTimestamp=${fromTimestamp}, toTimestamp=${toTimestamp}`,
      );
      return;
    }
    onDownload(fromTimestamp, toTimestamp);
  }

  function handleCancel(): void {
    onCancel();
  }

  return (
    <div className="modal-overlay-dialog-box">
      <div className="dialog-box">
        <p className="dialog-box-main-text">Download logs - Custom range</p>
        {/* <p className="dialog-box-sub-text">{subText}</p> */}
        <div className="download-logs-range-container">
          <div className="download-logs-from-container">
            <label htmlFor="download-logs-from">Start:</label>
            <input
              id="download-logs-from"
              name="from"
              type="datetime-local"
              className="date-picker"
              value={from}
              onChange={(e) => setFrom(e.currentTarget.value)}
            />
          </div>
          <div className="download-logs-to-container">
            <label htmlFor="download-logs-to">End:</label>
            <input
              id="download-logs-to"
              name="to"
              type="datetime-local"
              className="date-picker"
              value={to}
              onChange={(e) => setTo(e.currentTarget.value)}
            />
          </div>
        </div>
        <div className="dialog-box-btn-container two-btns">
          <button
            className="btn btn-1"
            onClick={handleCancel}
            ref={cancelBtnRef}
          >
            Cancel
          </button>
          <button
            className="btn btn-2 confirmation"
            onClick={handleDownload}
            disabled={invalidRange}
          >
            Download logs
          </button>
        </div>
      </div>
    </div>
  );
}
