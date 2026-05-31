import { App } from "uWebSockets.js";
import { helmet, type HelmetHeaderOptions } from "uwebsocketsjs-helmet";

const customHeaders: HelmetHeaderOptions = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
  "X-Frame-Options": "DENY",
};

const app = App();

app.any("/*", (res, req) => {
  helmet(customHeaders)(res, req);
  res.end("Hello from uWebSockets.js with custom security headers!");
});

app.listen(9001, (token) => {
  console.log(token ? "Listening to port 9001" : "Failed to listen to port 9001");
});
