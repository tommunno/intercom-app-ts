import { useEffect, useEffectEvent } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminUsersInfo } from "../../../shared/types/AdminUsersInfo.js";

export function useUsersInfo(
  onUsersInfo: (usersInfo: AdminUsersInfo) => void,
): void {
  const onUsersInfoEvent = useEffectEvent(onUsersInfo);

  useEffect(() => {
    const unsubscribe = setupWss.subscribe("ADMIN_LOGIN_RESPONSE", (update) => {
      if (!update.success) {
        return;
      }
      onUsersInfoEvent(update.adminSnapshot.usersInfo);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = setupWss.subscribe("ADMIN_UPDATE", (update) => {
      if (!update.usersInfo) {
        return;
      }
      onUsersInfoEvent(update.usersInfo);
    });
    return unsubscribe;
  }, []);
}
