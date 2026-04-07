import { useEffect, useEffectEvent } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminSoundcardsInfo } from "../../../shared/types/index.js";

export function useSoundcardsInfo(
  onSoundcardsInfo: (soundcardsInfo: AdminSoundcardsInfo) => void,
): void {
  const onSoundcardsInfoEvent = useEffectEvent(onSoundcardsInfo);

  useEffect(() => {
    const unsubscribe = setupWss.subscribe("ADMIN_LOGIN_RESPONSE", (update) => {
      if (!update.success) {
        return;
      }
      onSoundcardsInfoEvent(update.adminSnapshot.soundcardsInfo);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = setupWss.subscribe("ADMIN_UPDATE", (update) => {
      if (!update.soundcardsInfo) {
        return;
      }
      onSoundcardsInfoEvent(update.soundcardsInfo);
    });
    return unsubscribe;
  }, []);
}
