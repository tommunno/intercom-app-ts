import { useEffect, useState } from "react";
import setupWss from "../managers/setupWss.js";
import type { LoggingSectionInfo } from "../types/index.js";

export function useLoggingInfo(): [
  LoggingSectionInfo,
  React.Dispatch<React.SetStateAction<LoggingSectionInfo>>,
] {
  const [loggingInfo, setLoggingInfo] = useState<LoggingSectionInfo>({
    latestLogs: [],
    requestedLogs: { logs: null, position: "BETWEEN" },
  });
  useEffect(() => {
    const unsubscribeAdminLoginResponse = setupWss.subscribe(
      "ADMIN_LOGIN_RESPONSE",
      (update) => {
        if (!update.success) {
          return;
        }
        const { latestLogs, requestedLogs } = update.adminSnapshot.loggingInfo;
        setLoggingInfo((prev) => ({
          latestLogs,
          requestedLogs: requestedLogs
            ? requestedLogs.position === "LATEST"
              ? { ...requestedLogs, logs: null }
              : requestedLogs
            : prev.requestedLogs,
        }));
      },
    );
    const unsubscribeAdminUpdate = setupWss.subscribe(
      "ADMIN_UPDATE",
      (update) => {
        if (!update.loggingInfo) {
          return;
        }
        const { latestLogs, requestedLogs } = update.loggingInfo;
        setLoggingInfo((prev) => ({
          latestLogs,
          requestedLogs: requestedLogs
            ? requestedLogs.position === "LATEST"
              ? { ...requestedLogs, logs: null }
              : requestedLogs
            : prev.requestedLogs,
        }));
      },
    );
    return () => {
      unsubscribeAdminLoginResponse();
      unsubscribeAdminUpdate();
    };
  }, []);
  return [loggingInfo, setLoggingInfo];
}
