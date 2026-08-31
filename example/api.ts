import { App } from "uWebSockets.js";
import { apiHeaders, secureApp } from "uwebsocketsjs-helmet";

// apiHeaders replaces the HTML-oriented defaults with a leaner set for
// services that answer with JSON or serve WebSockets
const app = secureApp(App(), apiHeaders);

app.get("/health", (res) => {
  res.writeHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true }));
});

// upgrade handlers are left alone, so the handshake still completes
app.ws("/socket", {
  upgrade: (res, req, context) => {
    res.upgrade(
      {},
      req.getHeader("sec-websocket-key"),
      req.getHeader("sec-websocket-protocol"),
      req.getHeader("sec-websocket-extensions"),
      context,
    );
  },
  message: (ws, message, isBinary) => {
    ws.send(message, isBinary);
  },
});

app.listen(9001, (token) => {
  console.log(token ? "Listening to port 9001" : "Failed to listen to port 9001");
});
