import { describe, expect, it, vi } from "vitest";
import defaultExport, {
  defaultHeaders,
  type HelmetResponse,
  helmet,
  secureApp,
} from "../src/index.js";

/**
 * Minimal stand-in for a uWebSockets.js HttpResponse that records every
 * header written so assertions can read them back
 */
function mockRes() {
  const headers = new Map<string, string>();
  const writeHeader = vi.fn((key: string, value: string) => {
    headers.set(key, value);
  });
  const res: HelmetResponse & { headers: Map<string, string>; writeHeader: typeof writeHeader } = {
    writeHeader,
    headers,
  };
  return res;
}

const req = {};

describe("helmet()", () => {
  it("applies the full set of default headers", () => {
    const res = mockRes();
    helmet()(res, req);

    for (const [key, value] of Object.entries(defaultHeaders)) {
      expect(res.headers.get(key)).toBe(value);
    }
    expect(res.writeHeader).toHaveBeenCalledTimes(Object.keys(defaultHeaders).length);
  });

  it("does not set deprecated or non-default headers", () => {
    const res = mockRes();
    helmet()(res, req);

    expect(res.headers.has("Expect-CT")).toBe(false);
    expect(res.headers.has("Cross-Origin-Embedder-Policy")).toBe(false);
    expect(res.headers.has("X-Powered-By")).toBe(false);
  });

  it("matches Helmet 8 default values for key headers", () => {
    const res = mockRes();
    helmet()(res, req);

    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(res.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("overrides a default header when provided", () => {
    const res = mockRes();
    helmet({ "X-Frame-Options": "DENY" })(res, req);

    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("adds a custom header not present in the defaults", () => {
    const res = mockRes();
    helmet({ "Permissions-Policy": "geolocation=()" })(res, req);

    expect(res.headers.get("Permissions-Policy")).toBe("geolocation=()");
  });

  it("suppresses a default header when set to false", () => {
    const res = mockRes();
    helmet({ "X-Frame-Options": false })(res, req);

    expect(res.headers.has("X-Frame-Options")).toBe(false);
  });

  it("suppresses a default header when set to an empty string", () => {
    const res = mockRes();
    helmet({ "Strict-Transport-Security": "" })(res, req);

    expect(res.headers.has("Strict-Transport-Security")).toBe(false);
  });

  it("resolves the active header list once and reuses it across requests", () => {
    const handler = helmet();
    const a = mockRes();
    const b = mockRes();

    handler(a, req);
    handler(b, req);

    expect(a.headers.size).toBe(Object.keys(defaultHeaders).length);
    expect(b.headers.size).toBe(a.headers.size);
  });

  it("exposes a frozen defaultHeaders object", () => {
    expect(Object.isFrozen(defaultHeaders)).toBe(true);
  });

  it("overrides a default whose casing differs, without duplicating it", () => {
    const res = mockRes();
    helmet({ "x-frame-options": "DENY" })(res, req);

    // the canonical casing of the default is kept, and only one is written
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.has("x-frame-options")).toBe(false);
    expect(res.writeHeader).toHaveBeenCalledTimes(Object.keys(defaultHeaders).length);
  });

  it("suppresses a default whose casing differs", () => {
    const res = mockRes();
    helmet({ "strict-transport-security": false })(res, req);

    expect(res.headers.has("Strict-Transport-Security")).toBe(false);
    expect(res.headers.has("strict-transport-security")).toBe(false);
  });

  it("rejects a value containing CRLF, which would inject headers", () => {
    expect(() => helmet({ "X-Test": "a\r\nX-Injected: pwned" })).toThrow(TypeError);
  });

  it.each([
    ["a bare newline", { "X-Test": "a\nb" }],
    ["a carriage return", { "X-Test": "a\rb" }],
    ["a NUL byte", { "X-Test": "a\0b" }],
    ["a non-ASCII byte", { "X-Test": "café" }],
  ])("rejects %s in a header value", (_label, headers) => {
    expect(() => helmet(headers)).toThrow(TypeError);
  });

  it.each([
    ["a space", { "X Test": "1" }],
    ["a colon", { "X:Test": "1" }],
    ["a newline", { "X\nTest": "1" }],
    ["an empty name", { "": "1" }],
  ])("rejects %s in a header name", (_label, headers) => {
    expect(() => helmet(headers)).toThrow(TypeError);
  });

  it("rejects two overrides that differ only by case", () => {
    expect(() => helmet({ "X-Test": "1", "x-test": "2" })).toThrow(TypeError);
  });

  it("throws at construction time, not per request", () => {
    expect(() => helmet({ "X-Test": "bad\r\n" })).toThrow(TypeError);
  });

  it("accepts a suppressed header whose value would otherwise be invalid", () => {
    // `false` means "do not send", so there is nothing to validate
    expect(() => helmet({ "X-Frame-Options": false })).not.toThrow();
  });

  it("is also available as a default export", () => {
    expect(defaultExport).toBe(helmet);
  });
});

describe("helmet() status argument", () => {
  it("writes a status before the headers when given one", () => {
    const calls: string[] = [];
    const res = {
      writeStatus: vi.fn((status: string) => calls.push(`status:${status}`)),
      writeHeader: vi.fn((key: string) => calls.push(`header:${key}`)),
    };

    helmet()(res, "404 Not Found");

    expect(calls[0]).toBe("status:404 Not Found");
    expect(calls[1]).toBe("header:Content-Security-Policy");
  });

  it("ignores a request object, which is the long-standing signature", () => {
    const res = { writeStatus: vi.fn(), writeHeader: vi.fn() };

    helmet()(res, { getUrl: () => "/" });

    expect(res.writeStatus).not.toHaveBeenCalled();
    expect(res.writeHeader).toHaveBeenCalled();
  });

  it("still writes headers on a response with no writeStatus", () => {
    const res = mockRes();

    expect(() => helmet()(res, "404 Not Found")).not.toThrow();
    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });
});

/** Minimal stand-in for a uWebSockets.js TemplatedApp */
function mockApp() {
  const routes = new Map<string, (res: unknown, req: unknown) => void>();
  return {
    routes,
    get(pattern: string, handler: (res: unknown, req: unknown) => void) {
      routes.set(pattern, handler);
      return this;
    },
    ws: vi.fn(),
  };
}

describe("secureApp()", () => {
  it("returns the same app so it can wrap App() inline", () => {
    const app = mockApp();

    expect(secureApp(app)).toBe(app);
  });

  it("refuses to wrap the same app twice", () => {
    const app = mockApp();
    secureApp(app);

    expect(() => secureApp(app)).toThrow(TypeError);
  });

  it("validates its headers up front", () => {
    expect(() => secureApp(mockApp(), { "X-Test": "bad\r\n" })).toThrow(TypeError);
  });

  it("leaves app.ws untouched, since headers break the upgrade", () => {
    const app = mockApp();
    const original = app.ws;
    secureApp(app);

    expect(app.ws).toBe(original);
  });

  it("writes no headers until the handler commits the response", () => {
    const app = mockApp();
    secureApp(app);

    const res = { ...mockRes(), end: vi.fn() };
    let headersAtEntry = -1;
    app.get("/*", (response) => {
      headersAtEntry = (response as typeof res).headers.size;
      (response as typeof res).end();
    });

    app.routes.get("/*")?.(res, {});

    expect(headersAtEntry).toBe(0);
    expect(res.headers.size).toBe(Object.keys(defaultHeaders).length);
  });

  it("restores the native methods once the headers are flushed", () => {
    const app = mockApp();
    secureApp(app);

    const end = vi.fn();
    const res = { ...mockRes(), end };
    const nativeWriteHeader = res.writeHeader;

    app.get("/*", (response) => {
      (response as typeof res).end();
    });
    app.routes.get("/*")?.(res, {});

    expect(res.end).toBe(end);
    expect(res.writeHeader).toBe(nativeWriteHeader);
  });
});
