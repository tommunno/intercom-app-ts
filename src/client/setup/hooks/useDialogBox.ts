import { useContext } from "react";
import {
  DialogBoxContext,
  type DialogBoxContextValue,
} from "../contexts/index.js";

export function useDialogBox(): DialogBoxContextValue {
  const dialogBoxContext = useContext(DialogBoxContext);
  if (!dialogBoxContext) {
    throw new Error(
      "useDialogBox must be used within a DialogBoxContext provider",
    );
  }
  return dialogBoxContext;
}
