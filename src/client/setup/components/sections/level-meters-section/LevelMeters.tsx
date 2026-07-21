import { useLevelInfos } from "../../../hooks/useLevelInfos.js";
import type {
  NamedInputGainInfo,
  NamedInputGainsInfo,
} from "../../../types/index.js";
import { LevelMeter } from "./LevelMeter.jsx";

interface LevelMetersProps {
  inputGainsInfo: NamedInputGainsInfo;
  selectedInputGainInfo: NamedInputGainInfo | null;
  onLevelMeterSelect: (inputGainInfo: NamedInputGainInfo) => void;
}

export function LevelMeters({
  inputGainsInfo,
  selectedInputGainInfo,
  onLevelMeterSelect,
}: LevelMetersProps) {
  const [levelInfos] = useLevelInfos();

  return (
    <div className="level-meters">
      {inputGainsInfo.map((info) => (
        <LevelMeter
          key={info.id}
          inputGainInfo={info}
          isSelected={selectedInputGainInfo?.id === info.id}
          onSelect={onLevelMeterSelect}
          rmsDb={levelInfos[info.id]?.rmsDb ?? null}
        />
      ))}
    </div>
  );
}
