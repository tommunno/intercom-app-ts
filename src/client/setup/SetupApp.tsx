import { useState } from "react";
import {
  MainSpace,
  LoginForm,
  DialogBox,
  ErrorOverlay,
  Popup,
} from "./components/index.js";

type SetupScene = "login" | "main-space" | "error";

export default function SetupApp() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scene, setScene] = useState<SetupScene>("login");

  return (
    <>
      {scene !== "error" && <MainSpace />}
      {scene === "login" && <LoginForm />}
      {scene !== "error" && <DialogBox />}
      {scene === "error" && <ErrorOverlay />}
      {scene !== "error" && <Popup />}
    </>
  );
}
