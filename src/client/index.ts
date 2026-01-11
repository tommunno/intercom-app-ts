import httpLoginRequestTest from "./server-tests/httpLoginRequestTest.js";

// Expose it to the window so we can trigger it from the DevTools console
(window as any).httpLoginRequestTest = httpLoginRequestTest;
httpLoginRequestTest("admin", "password123");
