import { useEffect, useState } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminWebServerInfo } from "../../../shared/types/index.js";

export interface BannersSectionInfo {
  audioLossDetected: boolean;
  soundcardDevicesErr: boolean;
  httpsErr: boolean;
  turnErr: boolean;
  sslWarning: boolean;
}

const defaultBannersInfo: BannersSectionInfo = {
  audioLossDetected: false,
  soundcardDevicesErr: false,
  httpsErr: false,
  turnErr: false,
  sslWarning: false,
};

export function useBannersInfo(): BannersSectionInfo {
  const [bannersInfo, setBannersInfo] =
    useState<BannersSectionInfo>(defaultBannersInfo);

  useEffect(() => {
    const unsubscribeAdminLoginResponse = setupWss.subscribe(
      "ADMIN_LOGIN_RESPONSE",
      (update) => {
        if (!update.success) {
          return;
        }
        setBannersInfo({
          ...update.adminSnapshot.bannersInfo,
          ...calculateNetworkBanners(update.adminSnapshot.webServerInfo),
        });
      },
    );
    const unsubscribeAdminUpdate = setupWss.subscribe(
      "ADMIN_UPDATE",
      ({ bannersInfo, webServerInfo }) => {
        if (bannersInfo && webServerInfo) {
          setBannersInfo({
            ...bannersInfo,
            ...calculateNetworkBanners(webServerInfo),
          });
          return;
        }
        if (bannersInfo) {
          setBannersInfo((b) => ({ ...b, ...bannersInfo }));
          return;
        }
        if (webServerInfo) {
          setBannersInfo((b) => ({
            ...b,
            ...calculateNetworkBanners(webServerInfo),
          }));
          return;
        }
      },
    );
    return () => {
      unsubscribeAdminLoginResponse();
      unsubscribeAdminUpdate();
    };
  }, []);
  return bannersInfo;
}

function calculateNetworkBanners(webServerInfo: AdminWebServerInfo): {
  httpsErr: boolean;
  turnErr: boolean;
  sslWarning: boolean;
} {
  return {
    httpsErr: webServerInfo.httpsPort === null,
    turnErr: webServerInfo.turnServerPort === null,
    sslWarning: !webServerInfo.isSslCertValid,
  };
}
