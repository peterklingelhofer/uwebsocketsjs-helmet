import { App } from "uWebSockets.js";
import { helmet } from "../src/index";
// import { helmet } from "uwebsocketsjs-helmet";

const app = App();

app.any("/*", (res, req) => {
  helmet()(res, req); // Apply default helmet headers
  res.end("Hello from uWebSockets.js with helmet!");
});

app.listen(9001, (token) => {
  if (token) {
    console.log("Listening to port 9001");
  } else {
    console.log("Failed to listen to port 9001");
  }
});
