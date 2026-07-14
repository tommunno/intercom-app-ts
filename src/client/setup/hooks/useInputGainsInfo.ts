import { useEffect, useEffectEvent } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminInputGainsInfo } from "../../../shared/types/index.js";

export function useInputGainsInfo(
  onInputGainsInfo: (inputGainsInfo: AdminInputGainsInfo) => void,
): void {
  const onInputGainsInfoEvent = useEffectEvent(onInputGainsInfo);

  useEffect(() => {
    const unsubscribeAdminLoginResponse = setupWss.subscribe(
      "ADMIN_LOGIN_RESPONSE",
      (update) => {
        if (!update.success) {
          return;
        }
        onInputGainsInfoEvent(update.adminSnapshot.inputGainsInfo);
      },
    );
    const unsubscribeAdminUpdate = setupWss.subscribe(
      "ADMIN_UPDATE",
      (update) => {
        if (!update.inputGainsInfo) {
          return;
        }
        onInputGainsInfoEvent(update.inputGainsInfo);
      },
    );
    return () => {
      unsubscribeAdminLoginResponse();
      unsubscribeAdminUpdate();
    };
  }, []);
}
