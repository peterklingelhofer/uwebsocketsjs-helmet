"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getHelmetHeaders_1 = require("../../src/getHelmetHeaders");
describe("fetchHelmetHeaders", () => {
    test("fetches default Helmet headers", async () => {
        const headers = await (0, getHelmetHeaders_1.fetchHelmetHeaders)({});
        expect(headers['content-security-policy']).toBe("default-src 'self'");
        expect(headers['x-dns-prefetch-control']).toBe('off');
        expect(headers['expect-ct']).toBe('max-age=86400, enforce');
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains; preload');
        expect(headers['x-download-options']).toBe('noopen');
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['x-permitted-cross-domain-policies']).toBe('none');
        expect(headers['referrer-policy']).toBe('no-referrer');
        expect(headers['x-xss-protection']).toBe('0');
        expect(headers['cross-origin-embedder-policy']).toBe('require-corp');
        expect(headers['cross-origin-opener-policy']).toBe('same-origin');
        expect(headers['cross-origin-resource-policy']).toBe('same-origin');
        expect(headers['origin-agent-cluster']).toBe('?1');
        expect(headers).not.toHaveProperty('x-powered-by');
    });
    test("fetches custom Helmet headers", async () => {
        const customHeaders = {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"]
                }
            },
            frameguard: {
                action: "sameorigin"
            }
        };
        const headers = await (0, getHelmetHeaders_1.fetchHelmetHeaders)(customHeaders);
        expect(headers['content-security-policy']).toBe("default-src 'self'; script-src 'self' 'unsafe-inline'");
        expect(headers['x-frame-options']).toBe('sameorigin');
    });
});
