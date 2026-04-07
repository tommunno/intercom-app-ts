import { useState } from "react";
import { MainSpace } from "./components/MainSpace.jsx";
import { LoginForm } from "./components/overlays/LoginForm.jsx";
import {
  DialogBox,
  type DialogBoxConfig,
} from "./components/overlays/DialogBox.jsx";
import { ErrorOverlay } from "./components/overlays/ErrorOverlay.jsx";
import { Popup } from "./components/layout/Popup.jsx";
import { useSetupWssHandlers } from "./hooks/useSetupWssHandlers.js";
import logger from "../shared/logging/logger.js";

const log = logger.child({ context: "SetupApp" });

type SetupScene = "login" | "main-space" | "error";

export default function SetupApp() {
  const [scene, setScene] = useState<SetupScene>("login");
  const [dialogBoxConfig, setDialogBoxConfig] =
    useState<DialogBoxConfig | null>(null);

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

  function handleLogin() {
    setScene("main-space");
  }

  return (
    <>
      <MainSpace onDialogBoxConfig={(c) => setDialogBoxConfig(c)} />
      {scene === "login" && <LoginForm onLogin={handleLogin} />}
      {dialogBoxConfig && scene !== "error" && (
        <DialogBox
          config={dialogBoxConfig}
          onNewConfig={(c) => setDialogBoxConfig(c)}
        />
      )}
      {scene === "error" && <ErrorOverlay />}
      {scene !== "error" && <Popup />}
    </>
  );
}
