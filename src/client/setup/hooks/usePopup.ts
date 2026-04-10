import { useContext } from "react";
import {
  PopupContext,
  type PopupContextValue,
} from "../contexts/PopupContext.js";

export function usePopup(): PopupContextValue {
  const popupContext = useContext(PopupContext);
  if (!popupContext) {
    throw new Error("usePopup must be used within a PopupContext provider");
  }
  return popupContext;
}
