"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = require("uWebSockets.js");
const uwebsocketsjs_helmet_1 = require("uwebsocketsjs-helmet");
const app = (0, uWebSockets_js_1.App)();
app.any("/*", (res, req) => {
    (0, uwebsocketsjs_helmet_1.helmet)()(res, req); // Apply default helmet headers
    res.end("Hello from uWebSockets.js with helmet!");
});
app.listen(9001, (token) => {
    if (token) {
        console.log("Listening to port 9001");
    }
    else {
        console.log("Failed to listen to port 9001");
    }
});
