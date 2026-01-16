type OutgoingMessage = {
  type: string;
  payload: unknown;
};

export function createWssClient(path = "/") {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${window.location.host}${path}`;
  const ws = new WebSocket(wsUrl);

  function send(type: string, payload: unknown) {
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn("WS not open yet. readyState =", ws.readyState);
      return;
    }
    const msg: OutgoingMessage = { type, payload };
    ws.send(JSON.stringify(msg));
  }

  ws.addEventListener("open", () => console.log("WS open ✅", wsUrl));
  ws.addEventListener("message", (e) => console.log("WS message:", e.data));
  ws.addEventListener("close", (e) =>
    console.log("WS closed:", e.code, e.reason)
  );
  ws.addEventListener("error", (e) => console.log("WS error:", e));

  return { ws, send };
}
