import httpLoginRequestTest from "./server-tests/httpLoginRequestTest.js";
import { createWssClient } from "./server-tests/wssTest.js";

//HTTP Test:
(window as any).httpLoginRequestTest = httpLoginRequestTest;
httpLoginRequestTest("admin", "password123");

//WSS TEST:
const { ws, send } = createWssClient("/");

// expose for DevTools
Object.assign(window as any, { ws, wsSend: send });

ws.addEventListener("open", () => {
  send("USER_LOGIN", { myNumber: 457 });
});
