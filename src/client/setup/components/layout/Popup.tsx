import {
  useEffect,
  useEffectEvent,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  AdminPopup,
  AdminPopupType,
} from "../../../../shared/types/index.js";
import { usePopupMessages } from "../../hooks/usePopupMessages.js";

const popupSymbol: Record<AdminPopupType, string> = {
  success: "✅",
  info: "ℹ️",
  warning: "⚠️",
  error: "🚫",
};

export interface PopupConfig {
  isVisible: boolean;
  type: AdminPopupType;
  title: string;
  message: string;
}

export interface PopupProps {
  config: PopupConfig;
  setConfig: Dispatch<SetStateAction<PopupConfig>>;
}

export const defaultPopupConfig: PopupConfig = {
  isVisible: false,
  type: "success",
  title: "Success",
  message: "",
};

export function Popup({ config, setConfig }: PopupProps) {
  const { isVisible, type, title, message } = config;
  const hideTimeoutIdRef = useRef<number | null>(null);
  const setConfigEvent = useEffectEvent(setConfig);

  function handlePopupMessage({ type, title, message }: AdminPopup): void {
    setConfig({ isVisible: true, type, title, message });
  }
  usePopupMessages(handlePopupMessage);

  //Start a timer to hide the popup every time the content is changed and isVisible is true:
  useEffect(() => {
    if (isVisible) {
      hideTimeoutIdRef.current = setTimeout(
        () => setConfigEvent((c) => ({ ...c, isVisible: false })),
        4000,
      );
    }
    return () => {
      if (hideTimeoutIdRef.current !== null) {
        clearTimeout(hideTimeoutIdRef.current);
        hideTimeoutIdRef.current = null;
      }
    };
  }, [config, isVisible]);

  return (
    <div className={`popup ${isVisible ? "visible" : ""} ${type}`}>
      <div className={`popup-${type}-icon icon`}>{popupSymbol[type]}</div>
      <div className="popup-text">
        <p className="popup-title">{title}</p>
        <p className="popup-message">{message}</p>
      </div>
    </div>
  );
}
