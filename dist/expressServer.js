"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// expressServer.ts
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const app = (0, express_1.default)();
app.use((req, res, next) => {
    // Dynamic helmet options from process.env or other configuration
    const helmetOptions = JSON.parse(process.env.HELMET_OPTIONS || "{}");
    (0, helmet_1.default)(helmetOptions)(req, res, next);
});
app.get("*", (req, res) => {
    res.send("OK");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`);
});
