import { useEffect, useEffectEvent } from "react";
import type { SetupWssHandlers } from "../contracts/ISetupWssManager.js";
import setupWss from "../managers/setupWss.js";

//Note: This can only be used by one component at a time, since we are setting a handler, not subscribing:
export function useSetupWssHandlers(handlers: SetupWssHandlers): void {
  const onOpen = useEffectEvent(handlers.onOpen);
  const onClose = useEffectEvent(handlers.onClose);
  const onError = useEffectEvent(handlers.onError);
  const onServerRestored = useEffectEvent(handlers.onServerRestored);

  useEffect(() => {
    setupWss.setHandlers({ onOpen, onClose, onError, onServerRestored });
    return () => {
      setupWss.setHandlers(null);
    };
  }, []);
}
