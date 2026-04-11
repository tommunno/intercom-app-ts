import { useEffect, useState } from "react";
import setupWss from "../managers/setupWss.js";
import type { AdminAudioConfigInfo } from "../../../shared/types/index.js";

export function useAudioConfigInfo(): AdminAudioConfigInfo {
  const [audioConfigInfo, setAudioConfigInfo] = useState<AdminAudioConfigInfo>({
    numUsers: 0,
    numPartylines: 0,
  });

  useEffect(() => {
    const unsubscribe = setupWss.subscribe("ADMIN_LOGIN_RESPONSE", (update) => {
      if (!update.success) {
        return;
      }
      setAudioConfigInfo(update.adminSnapshot.audioConfigInfo);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = setupWss.subscribe("ADMIN_UPDATE", (update) => {
      if (!update.audioConfigInfo) {
        return;
      }
      setAudioConfigInfo(update.audioConfigInfo);
    });
    return unsubscribe;
  }, []);

  return audioConfigInfo;
}
