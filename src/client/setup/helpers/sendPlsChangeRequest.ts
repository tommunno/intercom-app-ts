import type { AdminPartylinesChangeRequest } from "../../../shared/types/index.js";
import setupWss from "../managers/setupWss.js";
import type { PlsSectionInfo } from "../types/index.js";
import { sanitizePlName } from "./setupHelpers.js";

export function sendPlsChangeRequest(plsInfo: PlsSectionInfo): void {
  const changeReq: AdminPartylinesChangeRequest = [];
  plsInfo.forEach((plInfo, plId) => {
    const { plName, changedPlName: cPlName } = plInfo;
    const sanitizedPlName = sanitizePlName(cPlName);
    changeReq.push({
      plId,
      plName: sanitizedPlName === plName ? null : sanitizedPlName,
    });
  });
  setupWss.send("ADMIN_PARTYLINES_CHANGE_REQUEST", changeReq);
}
