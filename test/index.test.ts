import { describe, expect, it, vi } from "vitest";
import defaultExport, { defaultHeaders, type HelmetResponse, helmet } from "../src/index.js";

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

  it("is also available as a default export", () => {
    expect(defaultExport).toBe(helmet);
  });
});
