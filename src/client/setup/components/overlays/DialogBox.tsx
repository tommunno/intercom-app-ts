import { useEffect, useRef } from "react";
import { useDialogBox } from "../../hooks/index.js";

export type DialogBoxConfig = {
  mainText: string;
  subText: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
};

export interface DialogBoxProps {
  config: DialogBoxConfig;
}

export function DialogBox({ config }: DialogBoxProps) {
  const { setDialogBoxConfig } = useDialogBox();
  const { mainText, subText, cancelText, confirmText, onConfirm } = config;
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  //Focus cancel button on mount:
  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  function handleConfirm(): void {
    onConfirm?.();
    setDialogBoxConfig(null);
  }

  function handleCancel(): void {
    setDialogBoxConfig(null);
  }

  return (
    <div className="modal-overlay-dialog-box">
      <div className="dialog-box">
        <p className="dialog-box-main-text">{mainText}</p>
        <p className="dialog-box-sub-text">{subText}</p>
        <div className="dialog-box-btn-container two-btns">
          <button
            className="btn btn-1"
            onClick={handleCancel}
            ref={cancelBtnRef}
          >
            {cancelText ?? "Cancel"}
          </button>
          <button className="btn btn-2 confirmation" onClick={handleConfirm}>
            {confirmText ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
