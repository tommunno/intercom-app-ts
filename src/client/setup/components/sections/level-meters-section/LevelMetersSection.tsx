import { useMemo, useState } from "react";
import { LevelMeters } from "./LevelMeters.jsx";
import { InputGain } from "./InputGain.jsx";
import { useInputGainsInfo } from "../../../hooks/useInputGainsInfo.js";
import {
  type AdminInputGainsInfo,
  type AdminUsersInfo,
} from "../../../../../shared/types/index.js";
import type {
  NamedInputGainInfo,
  NamedInputGainsInfo,
} from "../../../types/index.js";
import { useUsersInfo } from "../../../hooks/useUsersInfo.js";

function createNamedInputGainsInfo(
  inputGainsInfo: AdminInputGainsInfo,
  usersInfo: AdminUsersInfo,
): NamedInputGainsInfo {
  return inputGainsInfo.map((info) => {
    const username = usersInfo[info.id]?.username;
    if (!username) {
      return { ...info, name: String(info.id + 1) };
    }
    return { ...info, name: username };
  });
}

export function LevelMetersSection() {
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [inputGainsInfo, setInputGainsInfo] = useState<AdminInputGainsInfo>([]);
  const [usersInfo, setUsersInfo] = useState<AdminUsersInfo>([]);
  const [selectedInputGainId, setSelectedInputGainId] = useState<number | null>(
    null,
  );
  const namedInputGainsInfo: NamedInputGainsInfo = useMemo(
    () => createNamedInputGainsInfo(inputGainsInfo, usersInfo),
    [inputGainsInfo, usersInfo],
  );
  const selectedInputGainInfo: NamedInputGainInfo | null =
    namedInputGainsInfo.find((info) => info.id === selectedInputGainId) ?? null;

  const [localInputGain, setLocalInputGain] = useState<number>(
    selectedInputGainInfo?.gain ?? 0,
  );

  function handleLevelMeterSelect(inputGainInfo: NamedInputGainInfo): void {
    setSelectedInputGainId(inputGainInfo.id);
    setLocalInputGain(inputGainInfo.gain);
  }

  function handleInputGainsInfo(newInputGainsInfo: AdminInputGainsInfo): void {
    setInputGainsInfo(newInputGainsInfo);
    if (selectedInputGainId === null) return;
    const newGain = newInputGainsInfo.find(
      (info) => info.id === selectedInputGainId,
    )?.gain;
    if (newGain === undefined) return;
    setLocalInputGain(newGain);
  }
  useInputGainsInfo(handleInputGainsInfo);

  function handleUsersInfo(newUsersInfo: AdminUsersInfo): void {
    setUsersInfo(newUsersInfo);
  }
  useUsersInfo(handleUsersInfo);

  return (
    <div className={`level-meters-section section${isHidden ? " hidden" : ""}`}>
      <h2
        className="level-meters-section-title section-title"
        onClick={() => setIsHidden((h) => !h)}
      >
        Level Meters: <span className="expanding-arrow closed">▼</span>
        <span className="expanding-arrow open">▲</span>
      </h2>
      <div className="level-meters-inner-section inner-section not-table">
        <div className="level-meters-title">
          <h2>User Inputs</h2>
        </div>
        <div className="level-meters-container">
          <LevelMeters
            inputGainsInfo={namedInputGainsInfo}
            selectedInputGainInfo={selectedInputGainInfo}
            onLevelMeterSelect={handleLevelMeterSelect}
          />
        </div>
        <InputGain
          key={selectedInputGainInfo?.id}
          localInputGain={localInputGain}
          selectedInputGainInfo={selectedInputGainInfo}
          onLocalInputGainChange={(g) => setLocalInputGain(g)}
        />
      </div>
    </div>
  );
}
