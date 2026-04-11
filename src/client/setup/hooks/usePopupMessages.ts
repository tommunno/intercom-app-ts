import { useEffect, useEffectEvent } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminPopup } from "../../../shared/types/index.js";

export function usePopupMessages(onPopup: (popup: AdminPopup) => void): void {
  const onPopupEvent = useEffectEvent(onPopup);

  useEffect(() => {
    const unsubscribe = setupWss.subscribe("ADMIN_POPUP", (popup) => {
      onPopupEvent(popup);
    });
    return unsubscribe;
  }, []);
}
