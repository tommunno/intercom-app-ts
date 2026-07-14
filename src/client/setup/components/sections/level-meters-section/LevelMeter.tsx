import type { NamedInputGainInfo } from "../../../types/NamedInputGainsInfo.js";

interface LevelMeterProps {
  inputGainInfo: NamedInputGainInfo;
  isSelected: boolean;
  onSelect: (inputGainInfo: NamedInputGainInfo) => void;
}

export function LevelMeter({
  inputGainInfo,
  isSelected,
  onSelect,
}: LevelMeterProps) {
  return (
    <div
      className={`level-meter-container${isSelected ? " selected" : ""}`}
      data-uid="0"
      onClick={() => onSelect(inputGainInfo)}
    >
      <div className="level-meter">
        <div className="level-meter-led red" data-dbfs="-1"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-1"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-2"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-3"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-4"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-5"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-6"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-7"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-8"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-9"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led red" data-dbfs="-10"></div>
        <div className="level-meter-value">-10</div>
        <div className="level-meter-led yellow" data-dbfs="-11"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led yellow" data-dbfs="-12"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led yellow" data-dbfs="-13"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led yellow" data-dbfs="-14"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led yellow" data-dbfs="-15"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led yellow" data-dbfs="-16"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led yellow" data-dbfs="-17"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led yellow" data-dbfs="-18"></div>
        <div className="level-meter-value">-18</div>
        <div className="level-meter-led green" data-dbfs="-20"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-22"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-24"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-26"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-28"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-32"></div>
        <div className="level-meter-value">-32</div>
        <div className="level-meter-led green" data-dbfs="-36"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-40"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-44"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-48"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-52"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-56"></div>
        <div className="level-meter-value"></div>
        <div className="level-meter-led green" data-dbfs="-60"></div>
        <div className="level-meter-value">-60</div>
      </div>
      <div className="level-meter-label">{inputGainInfo.name}</div>
      <div
        className={`level-meter-gain-level${inputGainInfo.gain < 0 ? " negative" : inputGainInfo.gain > 0 ? " positive" : ""}`}
      >
        {inputGainInfo.gain}dB
      </div>
    </div>
  );
}
