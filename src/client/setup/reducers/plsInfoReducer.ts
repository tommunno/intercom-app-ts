import type { AdminPartylinesInfo } from "../../../shared/types/index.js";
import logger from "../../shared/logging/logger.js";
import { sanitizePlName } from "../helpers/setupHelpers.js";
import type { PlsSectionInfo } from "../types/index.js";

const log = logger.child({ context: "plsInfoReducer" });

type PlsSectionInfoAction =
  | {
      type: "new-server-data";
      serverData: AdminPartylinesInfo;
    }
  | {
      type: "normalize-after-save";
    }
  | {
      type: "new-pl-name";
      plId: number;
      newPlName: string;
    }
  | {
      type: "replace-pls-info";
      newPlsInfo: PlsSectionInfo;
    };

export function plsInfoReducer(
  prevPlsInfo: PlsSectionInfo,
  action: PlsSectionInfoAction,
): PlsSectionInfo {
  switch (action.type) {
    case "new-server-data": {
      const { serverData } = action;
      return handleNewServerData(prevPlsInfo, serverData);
    }
    case "normalize-after-save": {
      return handleNormalizeAfterSave(prevPlsInfo);
    }
    case "new-pl-name": {
      const { plId, newPlName } = action;
      return handleNewPlName(prevPlsInfo, plId, newPlName);
    }
    case "replace-pls-info": {
      return action.newPlsInfo;
    }
  }
}

function handleNewServerData(
  prevPlsInfo: PlsSectionInfo,
  serverData: AdminPartylinesInfo,
): PlsSectionInfo {
  const newInfo: PlsSectionInfo = [];
  serverData.forEach((plInfo, i) => {
    const { name } = plInfo;
    const prevPlInfo = prevPlsInfo[i];
    if (!prevPlInfo) {
      newInfo.push({
        id: i,
        plName: name,
        changedPlName: name,
        plNameErr: false,
      });
      return;
    }
    const shouldUpdatePlName =
      sanitizePlName(prevPlInfo.changedPlName) === prevPlInfo.plName;
    const changedPlName = shouldUpdatePlName ? name : prevPlInfo.changedPlName;

    newInfo.push({
      id: i,
      plName: name,
      changedPlName,
      plNameErr: shouldUpdatePlName ? false : prevPlInfo.plNameErr,
    });
  });
  return newInfo;
}

function handleNormalizeAfterSave(prevPlsInfo: PlsSectionInfo): PlsSectionInfo {
  return prevPlsInfo.map((plInfo) => {
    return {
      ...plInfo,
      changedPlName: sanitizePlName(plInfo.changedPlName),
    };
  });
}

function handleNewPlName(
  prevPlsInfo: PlsSectionInfo,
  plId: number,
  newPlName: string,
): PlsSectionInfo {
  const prevPlInfo = prevPlsInfo[plId];
  if (!prevPlInfo) {
    log.error(`handleNewPlName: No plInfo found for plId ${plId}`);
    return prevPlsInfo;
  }
  return prevPlsInfo.map((plInfo, i) => {
    if (i !== plId) {
      return plInfo;
    }
    return { ...plInfo, changedPlName: newPlName };
  });
}
