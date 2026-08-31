import { App } from "uWebSockets.js";
import { secureApp } from "uwebsocketsjs-helmet";

// secureApp applies the default security headers to every HTTP route
const app = secureApp(App());

app.any("/*", (res) => {
  res.end("ok");
});

// a status written anywhere in the handler is preserved
app.get("/missing", (res) => {
  res.writeStatus("404 Not Found");
  res.end("nope");
});

app.listen(9001, (token) => {
  if (token) {
    console.log("Listening to port 9001");
  } else {
    console.error("Failed to listen to port 9001");
    process.exit(1);
  }
});
