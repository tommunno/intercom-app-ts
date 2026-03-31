import ReactDom from "react-dom/client";
import { StrictMode } from "react";
import SetupApp from "./SetupApp.jsx";

ReactDom.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SetupApp />
  </StrictMode>,
);
