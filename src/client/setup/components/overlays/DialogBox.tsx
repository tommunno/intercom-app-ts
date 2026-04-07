import { useEffect, useRef } from "react";

export type DialogBoxConfig = {
  mainText: string;
  subText: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
};

export interface DialogBoxProps {
  config: DialogBoxConfig;
  onNewConfig: (config: DialogBoxConfig | null) => void;
}

export function DialogBox({ config, onNewConfig }: DialogBoxProps) {
  const { mainText, subText, cancelText, confirmText, onConfirm } = config;
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  //Focus cancel button on mount:
  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  function handleConfirm(): void {
    onConfirm?.();
    onNewConfig(null);
  }

  function handleCancel(): void {
    onNewConfig(null);
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
