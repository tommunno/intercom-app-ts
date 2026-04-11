import type { IClientLogger } from "../../shared/contracts/index.js";
import type { PlsSectionInfo } from "../types/index.js";
import { sanitizePlName, validatePlName } from "./setupHelpers.js";

export interface CalculatePlsErrsParams {
  id: number | null;
  plsInfo: PlsSectionInfo;
  plNameColumnErr: boolean;
  preserveNoColumnErrs?: boolean;
  logger: IClientLogger;
}

export interface CalculatePlsErrsResult {
  plsInfo: PlsSectionInfo;
  plNameColumnErr: boolean;
}

//If id is null, column errors are checked across all user fields. Otherwise, only the specified id is checked
// If preserveNoColumnErrs=true, no new column errors will be added if there are currently no column errors
//preserveNoColumnErrs defaults to false
export function calculatePlsErrs(
  params: CalculatePlsErrsParams,
): CalculatePlsErrsResult {
  const { id, plsInfo, plNameColumnErr, preserveNoColumnErrs, logger } = params;

  let idFound = false;
  const newPlsInfo: PlsSectionInfo = plsInfo.map((plInfo, i) => {
    const idMatches = id === i;
    if (idMatches) idFound = true;

    if (id === null || idMatches) {
      const { changedPlName: cPlName } = plInfo;

      //If id is null, check all fields:
      if (id === null) {
        return {
          ...plInfo,
          plNameErr: !validatePlName(sanitizePlName(cPlName)),
        };
      }
      //Otherwise, only check the specified type for this id:
      return {
        ...plInfo,
        plNameErr: !validatePlName(sanitizePlName(plInfo.changedPlName)),
      };
    }
    return plInfo;
  });
  if (id !== null && !idFound) {
    logger.error(
      `calculatePlsErrs: id ${id} not found. No changes have been made`,
    );
    return { plsInfo, plNameColumnErr };
  }

  //If preserveNoColumnErrs=true, if all column errors are currently false, then we preserve that state:
  if (preserveNoColumnErrs && !plNameColumnErr) {
    return { plsInfo: newPlsInfo, plNameColumnErr };
  }

  const newPlNameColumnErr = newPlsInfo.some((p) => p.plNameErr);

  return { plsInfo: newPlsInfo, plNameColumnErr: newPlNameColumnErr };
}
