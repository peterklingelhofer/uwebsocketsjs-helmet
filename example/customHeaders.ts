import { App } from "uWebSockets.js";
import { helmet, HelmetHeaderOptions } from "uwebsocketsjs-helmet";

const customHeaders: HelmetHeaderOptions = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
  "X-Frame-Options": "SAMEORIGIN",
};

const app = App();

app.any("/*", (res, req) => {
  // Apply custom helmet headers
  helmet(customHeaders)(res, req);

  res.end("Hello from uWebSockets.js with custom security headers!");
});

app.listen(9001, (token) => {
  if (token) {
    console.log("Listening to port 9001");
  } else {
    console.log("Failed to listen to port 9001");
  }
});
