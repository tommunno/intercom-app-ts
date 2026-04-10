import { createContext, type Dispatch, type SetStateAction } from "react";
import type { PopupConfig } from "../components/layout/Popup.js";

export type PopupContextValue = Dispatch<SetStateAction<PopupConfig>>;

export const PopupContext = createContext<PopupContextValue | null>(null);
