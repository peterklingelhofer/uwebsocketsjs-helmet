"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const http = __importStar(require("http"));
const startServer = (script) => {
    const server = (0, child_process_1.exec)(`node dist/${script}.js`, { cwd: __dirname + '/..' });
    server?.stdout?.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    server?.stderr?.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    return server;
};
const makeRequest = (path) => {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: 'localhost', port: 9001, path }, res => {
            const headers = res.headers;
            res.on('data', () => { });
            res.on('end', () => resolve({ headers }));
        });
        req.on('error', reject);
        req.end();
    });
};
describe('uWebSockets.js Helmet', () => {
    let server;
    beforeAll((done) => {
        (0, child_process_1.execSync)('pnpm run build', { cwd: __dirname + '/..' });
        server = startServer('index');
        server?.stdout?.on('data', (data) => {
            if (data.includes('Listening to port 9001')) {
                done();
            }
        });
        server?.stderr?.on('data', (data) => {
            console.error(`Server failed to start: ${data}`);
            done(new Error(`Server failed to start: ${data}`));
        });
    });
    afterAll((done) => {
        server.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            done();
        });
        server.kill();
    });
    test('default headers are set', async () => {
        const response = await makeRequest('/');
        expect(response.headers['content-security-policy']).toBe("default-src 'self'");
        expect(response.headers['x-dns-prefetch-control']).toBe('off');
        expect(response.headers['expect-ct']).toBe('max-age=86400, enforce');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains; preload');
        expect(response.headers['x-download-options']).toBe('noopen');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
        expect(response.headers['referrer-policy']).toBe('no-referrer');
        expect(response.headers['x-xss-protection']).toBe('0');
        expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
        expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
        expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
        expect(response.headers['origin-agent-cluster']).toBe('?1');
        expect(response.headers).not.toHaveProperty('x-powered-by');
    });
    test('custom headers are set', async () => {
        server.kill();
        server = startServer('customHeaders');
        await new Promise(resolve => server?.stdout?.on('data', (data) => {
            if (data.includes('Listening to port 9001')) {
                resolve(true);
            }
        }));
        const response = await makeRequest('/');
        expect(response.headers['content-security-policy']).toBe("default-src 'self'; script-src 'self' 'unsafe-inline'");
        expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
});
