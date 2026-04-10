import { useState } from "react";
import { MainSpace } from "./components/MainSpace.jsx";
import { LoginForm } from "./components/overlays/LoginForm.jsx";
import {
  DialogBox,
  type DialogBoxConfig,
} from "./components/overlays/DialogBox.jsx";
import { ErrorOverlay } from "./components/overlays/ErrorOverlay.jsx";
import {
  defaultPopupConfig,
  Popup,
  type PopupConfig,
} from "./components/layout/Popup.jsx";
import { useSetupWssHandlers } from "./hooks/useSetupWssHandlers.js";
import logger from "../shared/logging/logger.js";
import { DialogBoxContext } from "./contexts/DialogBoxContext.js";
import { PopupContext } from "./contexts/PopupContext.js";

const log = logger.child({ context: "SetupApp" });

type SetupScene = "login" | "main-space" | "error";

export default function SetupApp() {
  const [scene, setScene] = useState<SetupScene>("login");
  const [dialogBoxConfig, setDialogBoxConfig] =
    useState<DialogBoxConfig | null>(null);
  const [popupConfig, setPopupConfig] =
    useState<PopupConfig>(defaultPopupConfig);

  function handleWssOpen(): void {}

  function handleWssClose(): void {
    setScene("error");
    log.error("Connection closed");
  }
  function handleWssError(): void {
    setScene("error");
    log.error("Connection error");
  }
  function handleServerRestored(): void {
    window.location.reload();
  }
  useSetupWssHandlers({
    onOpen: handleWssOpen,
    onClose: handleWssClose,
    onError: handleWssError,
    onServerRestored: handleServerRestored,
  });

  function handleLogin(): void {
    setScene("main-space");
  }

  return (
    <DialogBoxContext value={{ dialogBoxConfig, setDialogBoxConfig }}>
      <PopupContext value={setPopupConfig}>
        <MainSpace />
        {scene === "login" && <LoginForm onLogin={handleLogin} />}
        {dialogBoxConfig && scene !== "error" && (
          <DialogBox config={dialogBoxConfig} />
        )}
        {scene === "error" && <ErrorOverlay />}
        {scene !== "error" && (
          <Popup config={popupConfig} setConfig={setPopupConfig} />
        )}
      </PopupContext>
    </DialogBoxContext>
  );
}
