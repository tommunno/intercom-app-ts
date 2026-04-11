import { useEffect, useState } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminWebServerInfo } from "../../../shared/types/index.js";

const defaultWebServerInfo: AdminWebServerInfo = {
  httpsPort: null,
  httpPort: 80,
  turnServerPort: null,
  isTurnServerOnline: false,
  ipv4Interfaces: {},
  domainName: null,
  isSslCertValid: false,
  cpuUsage: 0,
  memoryUsage: 0,
};

export function useWebServerInfo(): AdminWebServerInfo {
  const [webServerInfo, setWebServerInfo] =
    useState<AdminWebServerInfo>(defaultWebServerInfo);

  useEffect(() => {
    const unsubscribeAdminLoginResponse = setupWss.subscribe(
      "ADMIN_LOGIN_RESPONSE",
      (update) => {
        if (!update.success) {
          return;
        }
        setWebServerInfo(update.adminSnapshot.webServerInfo);
      },
    );
    const unsubscribeAdminUpdate = setupWss.subscribe(
      "ADMIN_UPDATE",
      (update) => {
        if (!update.webServerInfo) {
          return;
        }
        setWebServerInfo(update.webServerInfo);
      },
    );
    return () => {
      unsubscribeAdminLoginResponse();
      unsubscribeAdminUpdate();
    };
  }, []);
  return webServerInfo;
}
