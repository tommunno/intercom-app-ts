export type DisplayPopupParams =
  | {
      type: PopupType;
      title: string;
      message?: string;
      autoHide: false;
    }
  | {
      type: PopupType;
      title: string;
      message?: string;
      autoHide: true;
      hideTime: number;
    };

export const POPUP_TYPES = {
  SUCCESS: "success",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  AUDIO: "audio",
} as const;

export type PopupType = (typeof POPUP_TYPES)[keyof typeof POPUP_TYPES];
