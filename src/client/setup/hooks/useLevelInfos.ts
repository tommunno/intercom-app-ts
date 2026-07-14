import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import setupWss from "../managers/setupWss.js";
import type { AudioLevelInfos } from "../../../shared/types/index.js";

export function useLevelInfos(): [
  AudioLevelInfos,
  Dispatch<SetStateAction<AudioLevelInfos>>,
] {
  const [levelInfos, setLevelInfos] = useState<AudioLevelInfos>([]);

  useEffect(() => {
    const unsubscribeAdminLevelMeters = setupWss.subscribe(
      "ADMIN_LEVEL_METERS",
      (levelInfos) => {
        setLevelInfos(levelInfos);
      },
    );
    return () => {
      unsubscribeAdminLevelMeters();
    };
  }, []);
  return [levelInfos, setLevelInfos];
}
