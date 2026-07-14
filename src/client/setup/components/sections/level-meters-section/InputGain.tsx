import { useEffect, useRef } from "react";
import {
  MAX_INPUT_GAIN,
  MIN_INPUT_GAIN,
} from "../../../../../shared/constants/sharedConstants.js";
import type { AdminInputGainChangeRequest } from "../../../../../shared/types/index.js";
import setupWss from "../../../managers/setupWss.js";
import { INPUT_GAIN_CHANGE_DEBOUNCE_INTERVAL } from "../../../../shared/constants/clientConstants.js";
import type { NamedInputGainInfo } from "../../../types/index.js";

interface InputGainProps {
  localInputGain: number;
  selectedInputGainInfo: NamedInputGainInfo | null;
  onLocalInputGainChange: (newGain: number) => void;
}

export function InputGain({
  localInputGain,
  selectedInputGainInfo: info,
  onLocalInputGainChange,
}: InputGainProps) {
  const gainChangeTimeoutRef = useRef<number | null>(null);
  const gainChangePendingValueRef = useRef<AdminInputGainChangeRequest | null>(
    null,
  );

  const isAtMinGain = localInputGain <= MIN_INPUT_GAIN;
  const isAtMaxGain = localInputGain >= MAX_INPUT_GAIN;

  function sendGainChangeRequest(): void {
    if (gainChangePendingValueRef.current === null) return;
    setupWss.send(
      "ADMIN_INPUT_GAIN_CHANGE_REQUEST",
      gainChangePendingValueRef.current,
    );
    gainChangePendingValueRef.current = null;
  }

  useEffect(() => {
    return () => {
      if (gainChangeTimeoutRef.current !== null) {
        clearTimeout(gainChangeTimeoutRef.current);
        gainChangeTimeoutRef.current = null;
      }
      sendGainChangeRequest();
    };
  }, []);

  function scheduleGainChangeRequest(
    request: AdminInputGainChangeRequest,
  ): void {
    gainChangePendingValueRef.current = request;
    if (gainChangeTimeoutRef.current !== null) {
      clearTimeout(gainChangeTimeoutRef.current);
    }
    gainChangeTimeoutRef.current = setTimeout(() => {
      sendGainChangeRequest();
      gainChangeTimeoutRef.current = null;
    }, INPUT_GAIN_CHANGE_DEBOUNCE_INTERVAL);
  }

  function handleChangeGain(direction: "+" | "-"): void {
    if (
      !info ||
      (direction === "-" && isAtMinGain) ||
      (direction === "+" && isAtMaxGain)
    ) {
      return;
    }
    const newGain = direction === "+" ? localInputGain + 1 : localInputGain - 1;
    onLocalInputGainChange(newGain);
    scheduleGainChangeRequest({ id: info.id, gain: newGain });
  }

  return (
    <div className={`input-gain-container${info ? "" : " unselected"}`}>
      <p className="input-gain-label">Input Gain</p>
      <p
        className="input-gain-selected-meter-message"
        style={{ fontSize: info ? "10px" : "8px" }}
      >
        {info ? info.name : "No meter selected"}
      </p>
      <div className="input-gain-btn-container">
        <button
          className="btn input-gain-down-btn input-gain-btn"
          disabled={!info || isAtMinGain}
          onClick={() => handleChangeGain("-")}
        >
          -
        </button>
        <p
          className={`input-gain-value${info && localInputGain !== info.gain ? " input-changed" : ""}`}
        >
          {localInputGain} dB
        </p>
        <button
          className="btn input-gain-up-btn input-gain-btn"
          disabled={!info || isAtMaxGain}
          onClick={() => handleChangeGain("+")}
        >
          +
        </button>
      </div>
    </div>
  );
}
