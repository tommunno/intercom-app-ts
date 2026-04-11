import { useState } from "react";
// import logger from "../../../../shared/logging/logger.js";
import { sanitizePlName } from "../../../helpers/setupHelpers.js";
import type { PlSectionInfo } from "../../../types/index.js";

export interface PlsSectionRowProps {
  plInfo: PlSectionInfo;
  onInputChange: (plId: number, newPlName: string) => void;
  onInputBlur: (plId: number) => void;
}

// const log = logger.child({ context: "PlsSectionRow" });

export function PlsSectionRow({
  plInfo,
  onInputChange,
  onInputBlur,
}: PlsSectionRowProps) {
  const { id, plName, changedPlName, plNameErr } = plInfo;

  const [isEditingPlName, setIsEditingPlName] = useState<boolean>(false);

  const plNameChanged = sanitizePlName(changedPlName) !== plName;

  return (
    <tr>
      <td>
        <p className="row-number">{id + 1}</p>
      </td>
      <td>
        <input
          className={`pl-name-input${plNameChanged && (!plNameErr || isEditingPlName) ? " input-changed" : ""}${!isEditingPlName && plNameErr ? " error" : ""}`}
          type="text"
          name="Partyline Name"
          value={changedPlName}
          onChange={(e) => onInputChange(id, e.currentTarget.value)}
          onFocus={() => setIsEditingPlName(true)}
          onBlur={() => {
            setIsEditingPlName(false);
            onInputBlur(id);
          }}
        />
      </td>
    </tr>
  );
}
