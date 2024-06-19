"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = require("uWebSockets.js");
const uwebsocketsjs_helmet_1 = require("uwebsocketsjs-helmet");
const customHeaders = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
    "X-Frame-Options": "SAMEORIGIN",
};
const app = (0, uWebSockets_js_1.App)();
app.any("/*", (res, req) => {
    // Apply custom helmet headers
    (0, uwebsocketsjs_helmet_1.helmet)(customHeaders)(res, req);
    res.end("Hello from uWebSockets.js with custom security headers!");
});
app.listen(9001, (token) => {
    if (token) {
        console.log("Listening to port 9001");
    }
    else {
        console.log("Failed to listen to port 9001");
    }
});
