import { useEffect, useEffectEvent } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminPartylinesInfo } from "../../../shared/types/AdminPartylinesInfo.js";

export function usePlsInfo(
  onPlsInfo: (plsInfo: AdminPartylinesInfo) => void,
): void {
  const onPlsInfoEvent = useEffectEvent(onPlsInfo);

  useEffect(() => {
    const unsubscribeAdminLoginResponse = setupWss.subscribe(
      "ADMIN_LOGIN_RESPONSE",
      (update) => {
        if (!update.success) {
          return;
        }
        onPlsInfoEvent(update.adminSnapshot.partylinesInfo);
      },
    );
    const unsubscribeAdminUpdate = setupWss.subscribe(
      "ADMIN_UPDATE",
      (update) => {
        if (!update.partylinesInfo) {
          return;
        }
        onPlsInfoEvent(update.partylinesInfo);
      },
    );
    return () => {
      unsubscribeAdminLoginResponse();
      unsubscribeAdminUpdate();
    };
  }, []);
}
