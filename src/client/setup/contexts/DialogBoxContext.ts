import { createContext, type Dispatch, type SetStateAction } from "react";
import type { DialogBoxConfig } from "../components/overlays/DialogBox.js";

export type DialogBoxContextValue = {
  dialogBoxConfig: DialogBoxConfig | null;
  setDialogBoxConfig: Dispatch<SetStateAction<DialogBoxConfig | null>>;
};
export const DialogBoxContext = createContext<DialogBoxContextValue | null>(
  null,
);
