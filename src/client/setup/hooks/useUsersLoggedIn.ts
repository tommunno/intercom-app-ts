import { useEffect, useEffectEvent } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminUsersLoggedInUpdate } from "../../../shared/types/AdminUsersLoggedInUpdate.js";

export function useUsersLoggedIn(
  onUsersLoggedIn: (usersLoggedIn: AdminUsersLoggedInUpdate) => void,
): void {
  const onUsersLoggedInEvent = useEffectEvent(onUsersLoggedIn);

  useEffect(() => {
    const unsubscribe = setupWss.subscribe(
      "ADMIN_USERS_LOGGED_IN_UPDATE",
      (update) => {
        onUsersLoggedInEvent(update);
      },
    );
    return unsubscribe;
  }, []);
}
