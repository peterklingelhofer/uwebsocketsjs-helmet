import { App } from "uWebSockets.js";
import { helmet } from "uwebsocketsjs-helmet";

const app = App();

app.any("/*", (res, req) => {
  helmet()(res, req); // Apply default helmet headers
  res.end();
});

app.listen(9001, (token) => {
  if (token) {
    console.log("Listening to port 9001");
  } else {
    console.error("Failed to listen to port 9001");
    process.exit(1); // Exit the process with an error code
  }
});
