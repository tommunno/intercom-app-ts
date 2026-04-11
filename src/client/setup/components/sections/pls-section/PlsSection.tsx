import { useReducer, useState } from "react";
import { PlsSectionBanner } from "./PlsSectionBanner.jsx";
import { PlsSectionRow } from "./PlsSectionRow.jsx";
import logger from "../../../../shared/logging/logger.js";
import { flushSync } from "react-dom";
import { plsInfoReducer } from "../../../reducers/index.js";
import { calculatePlsErrs } from "../../../helpers/calculatePlsErrs.js";
import type { AdminPartylinesInfo } from "../../../../../shared/types/AdminPartylinesInfo.js";
import { usePlsInfo } from "../../../hooks/index.js";
import { sendPlsChangeRequest } from "../../../helpers/index.js";

const log = logger.child({ context: "PlsSection" });

export function PlsSection() {
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [plsInfo, plsInfoDispatch] = useReducer(plsInfoReducer, []);
  const [plNameColumnErr, setPlNameColumnErr] = useState<boolean>(false);

  function handlePlsInfo(newPlsInfo: AdminPartylinesInfo): void {
    plsInfoDispatch({
      type: "new-server-data",
      serverData: newPlsInfo,
    });
  }
  usePlsInfo(handlePlsInfo);

  function handleInputChange(plId: number, newPlName: string): void {
    plsInfoDispatch({ type: "new-pl-name", plId, newPlName });
  }

  function handleInputBlur(plId: number): void {
    const { plsInfo: newPlsInfo, plNameColumnErr: newCE } = calculatePlsErrs({
      id: plId,
      plsInfo,
      plNameColumnErr,
      logger: log,
    });
    plsInfoDispatch({ type: "replace-pls-info", newPlsInfo });
    setPlNameColumnErr(newCE);
  }

  function handleSaveChanges(e: React.MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();
    const { plsInfo: calculatedPlsInfo, plNameColumnErr: newCE } =
      calculatePlsErrs({
        id: null,
        plsInfo,
        plNameColumnErr,
        logger: log,
      });

    if (!newCE) {
      sendPlsChangeRequest(calculatedPlsInfo);
    }
    //Flush sync so that the blur happens after the state has been updated:
    flushSync(() => {
      plsInfoDispatch({
        type: "replace-pls-info",
        newPlsInfo: calculatedPlsInfo,
      });
      if (!newCE) {
        plsInfoDispatch({ type: "normalize-after-save" });
      }
      setPlNameColumnErr(newCE);
    });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  return (
    <div className={`pls-section section${isHidden ? " hidden" : ""}`}>
      <h2
        className="pls-section-title section-title"
        onClick={() => setIsHidden((h) => !h)}
      >
        Partylines: <span className="expanding-arrow closed">&#9660;</span>
        <span className="expanding-arrow open">&#9650;</span>
      </h2>
      <PlsSectionBanner plNameColumnErr={plNameColumnErr} />
      <form className="pls-form form">
        <table className="pls-form-table form-table">
          <thead>
            <tr>
              <th></th>
              <th>Partyline Name</th>
              <th>
                <button
                  type="submit"
                  className="save-changes-btn btn"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="pls-form-table-body">
            {plsInfo.map((plInfo) => (
              <PlsSectionRow
                key={plInfo.id}
                plInfo={plInfo}
                onInputChange={handleInputChange}
                onInputBlur={handleInputBlur}
              />
            ))}
          </tbody>
        </table>
      </form>
    </div>
  );
}
