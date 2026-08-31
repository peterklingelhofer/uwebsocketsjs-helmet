import { App } from "uWebSockets.js";
import { type HelmetHeaderOptions, secureApp } from "uwebsocketsjs-helmet";

const customHeaders: HelmetHeaderOptions = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "geolocation=()",
};

const app = secureApp(App(), customHeaders);

app.any("/*", (res) => {
  res.end("Hello from uWebSockets.js with custom security headers!");
});

app.listen(9001, (token) => {
  console.log(token ? "Listening to port 9001" : "Failed to listen to port 9001");
});
