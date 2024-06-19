"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHelmetHeaders = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = __importDefault(require("http"));
function getHelmetHeaders(helmetOptions) {
    return new Promise((resolve, reject) => {
        const app = (0, express_1.default)();
        app.use((0, helmet_1.default)(helmetOptions));
        const server = http_1.default.createServer(app);
        app.get("/", (req, res) => {
            res.send("OK");
        });
        server.listen(0, () => {
            const port = server.address().port;
            http_1.default.get(`http://localhost:${port}`, (res) => {
                const headers = res.headers;
                server.close(() => resolve(headers));
            }).on("error", (err) => {
                server.close(() => reject(err));
            });
        });
    });
}
exports.getHelmetHeaders = getHelmetHeaders;
