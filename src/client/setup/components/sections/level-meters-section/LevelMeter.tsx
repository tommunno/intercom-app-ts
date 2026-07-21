import type { NamedInputGainInfo } from "../../../types/NamedInputGainsInfo.js";
import { useEffect, useState, Fragment, useRef, memo } from "react";
import {
  LEVEL_METER_DECAY_PER_FRAME,
  LEVEL_METER_LOWEST_VISUAL_LEVEL,
} from "../../../../shared/constants/clientConstants.js";

interface LevelMeterProps {
  inputGainInfo: NamedInputGainInfo;
  isSelected: boolean;
  onSelect: (inputGainInfo: NamedInputGainInfo) => void;
  rmsDb: number | null;
}

interface Led {
  dbfs: number;
  label: string | null;
}

const leds = [
  { dbfs: -1, label: null },
  { dbfs: -1, label: null },
  { dbfs: -2, label: null },
  { dbfs: -3, label: null },
  { dbfs: -4, label: null },
  { dbfs: -5, label: null },
  { dbfs: -6, label: null },
  { dbfs: -7, label: null },
  { dbfs: -8, label: null },
  { dbfs: -9, label: null },
  { dbfs: -10, label: "-10" },
  { dbfs: -11, label: null },
  { dbfs: -12, label: null },
  { dbfs: -13, label: null },
  { dbfs: -14, label: null },
  { dbfs: -15, label: null },
  { dbfs: -16, label: null },
  { dbfs: -17, label: null },
  { dbfs: -18, label: "-18" },
  { dbfs: -20, label: null },
  { dbfs: -22, label: null },
  { dbfs: -24, label: null },
  { dbfs: -26, label: null },
  { dbfs: -28, label: null },
  { dbfs: -32, label: "-32" },
  { dbfs: -36, label: null },
  { dbfs: -40, label: null },
  { dbfs: -44, label: null },
  { dbfs: -48, label: null },
  { dbfs: -52, label: null },
  { dbfs: -56, label: null },
  { dbfs: -60, label: "-60" },
] as const satisfies readonly Led[];
const redMin = -10;
const yellowMin = -18;

//memo just in order to ensure all level meters aren't being re-rendered every time new levelInfos arrive in the parent (ie every 10th of a second):
export const LevelMeter = memo(function LevelMeter({
  inputGainInfo,
  isSelected,
  onSelect,
  rmsDb,
}: LevelMeterProps) {
  const [visualLevel, setVisualLevel] = useState<number>(
    LEVEL_METER_LOWEST_VISUAL_LEVEL,
  );
  const targetLevelRef = useRef<number | null>(rmsDb);

  useEffect(() => {
    targetLevelRef.current = rmsDb;
  }, [rmsDb]);

  useEffect(() => {
    let animationFrameId: number;

    function animateLevelMeterDecay(): void {
      animationFrameId = requestAnimationFrame(animateLevelMeterDecay);
      setVisualLevel((prevVisualLevel) => {
        if (targetLevelRef.current === null) {
          return LEVEL_METER_LOWEST_VISUAL_LEVEL;
        }
        return Math.max(
          targetLevelRef.current,
          prevVisualLevel - LEVEL_METER_DECAY_PER_FRAME,
        );
      });
    }
    animateLevelMeterDecay();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className={`level-meter-container${isSelected ? " selected" : ""}`}
      onClick={() => onSelect(inputGainInfo)}
    >
      <div className="level-meter">
        {leds.map((led, i) => (
          <Fragment key={i}>
            <div
              className={`level-meter-led ${led.dbfs >= redMin ? "red" : led.dbfs >= yellowMin ? "yellow" : "green"}${led.dbfs < visualLevel ? " on" : ""}`}
              data-dbfs={String(led.dbfs)}
            ></div>
            <div className="level-meter-value">{led.label ?? ""}</div>
          </Fragment>
        ))}
      </div>
      <div className="level-meter-label">{inputGainInfo.name}</div>
      <div
        className={`level-meter-gain-level${inputGainInfo.gain < 0 ? " negative" : inputGainInfo.gain > 0 ? " positive" : ""}`}
      >
        {inputGainInfo.gain}dB
      </div>
    </div>
  );
});
