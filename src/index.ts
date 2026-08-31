/**
 * The subset of a uWebSockets.js `HttpResponse` that this middleware needs.
 *
 * A real uWebSockets.js `HttpResponse` satisfies this structurally, so you can
 * pass one directly. Typing against this minimal shape (rather than importing
 * uWebSockets.js's recursive `HttpResponse` interface) keeps the public API
 * dependency-free and trivial to mock in tests.
 */
export interface HelmetResponse {
  writeHeader(key: string, value: string): unknown;
}

/**
 * A map of HTTP response header names to their values.
 *
 * Pass this to {@link helmet} to override or extend the secure defaults.
 * Set a value to `false` or `""` to omit that header entirely.
 */
export type HelmetHeaderOptions = Record<string, string | false>;

/** A uWebSockets.js route handler that writes security headers onto the response. */
export type HelmetHandler = (res: HelmetResponse, req?: unknown) => void;

/**
 * The default security headers applied by {@link helmet}.
 *
 * These mirror the out-of-the-box defaults of Helmet 8 for Express
 * (https://helmetjs.github.io) so behaviour is predictable for anyone
 * migrating from the Express or Fastify ecosystems.
 *
 * Deliberately omitted versus older releases of this package:
 * - `Expect-CT`: deprecated and removed from browsers; Helmet dropped it in v6
 * - `Cross-Origin-Embedder-Policy`: not a Helmet default; it breaks many sites
 */
export const defaultHeaders: Readonly<Record<string, string>> = Object.freeze({
  "Content-Security-Policy":
    "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Origin-Agent-Cluster": "?1",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "X-Download-Options": "noopen",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Permitted-Cross-Domain-Policies": "none",
  "X-XSS-Protection": "0",
});

/**
 * Create a uWebSockets.js handler that writes a set of security headers
 * onto the response.
 *
 * @param headers - overrides merged on top of {@link defaultHeaders}, matched
 * case-insensitively. Set a value to `false` (or `""`) to suppress one of the
 * defaults.
 * @returns a `(res, req) => void` function to call inside a route handler.
 * @throws TypeError if a header name is not a valid token, a value contains
 * control characters, or two overrides differ only by case.
 *
 * @remarks
 * uWebSockets.js writes responses into a linear buffer, so call order is wire
 * order. The first `writeHeader` commits the status line as `200 OK`, which
 * means:
 *
 * - Call `res.writeStatus(...)` *before* this handler. A `writeStatus` after
 *   the first header write is silently discarded.
 * - Never call this in a WebSocket `upgrade` handler. Committing `200 OK`
 *   stops `res.upgrade()` from sending `101 Switching Protocols` and breaks
 *   the handshake.
 *
 * When responding outside the synchronous top of a route handler, do this
 * inside a `res.cork(...)` callback.
 *
 * @example
 * ```ts
 * app.any("/*", (res, req) => {
 *   helmet()(res, req);
 *   res.end("ok");
 * });
 * ```
 *
 * @example Writing a non-200 status
 * ```ts
 * app.get("/missing", (res) => {
 *   res.writeStatus("404 Not Found");
 *   helmet()(res);
 *   res.end("nope");
 * });
 * ```
 */
/** RFC 9110 token: the only characters legal in a header field name */
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/** Printable ASCII plus horizontal tab, which is all a field value may contain */
const HEADER_VALUE = /^[\t\x20-\x7e]*$/;

/**
 * uWebSockets.js writes header names and values to the socket verbatim, with
 * no validation of its own. A CR or LF in a value would therefore inject
 * arbitrary extra headers into the response (HTTP response splitting), so
 * reject anything malformed rather than emitting it.
 */
function assertValidHeader(name: string, value: string): void {
  if (!HEADER_NAME.test(name)) {
    throw new TypeError(`Invalid header name ${JSON.stringify(name)}: expected an RFC 9110 token`);
  }
  if (!HEADER_VALUE.test(value)) {
    throw new TypeError(
      `Invalid value for header ${name}: control characters and non-ASCII bytes are not allowed`,
    );
  }
}

/**
 * Merge overrides onto the base headers and return the list to write.
 *
 * Header names are case-insensitive, so the merge is too: `x-frame-options`
 * overrides the `X-Frame-Options` default rather than being sent alongside it
 * as a second, conflicting header. The base's canonical casing is preserved.
 */
function resolveHeaders(
  overrides: HelmetHeaderOptions,
  base: Readonly<Record<string, string>>,
): [string, string][] {
  const byName = new Map<string, [name: string, value: string | false]>();

  for (const [name, value] of Object.entries(base)) {
    byName.set(name.toLowerCase(), [name, value]);
  }

  const seen = new Set<string>();
  for (const [name, value] of Object.entries(overrides)) {
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      throw new TypeError(
        `Duplicate header ${JSON.stringify(name)}: header names are case-insensitive, so only one spelling may be given`,
      );
    }
    seen.add(lower);
    // keep the canonical casing when overriding one of the base headers
    byName.set(lower, [byName.get(lower)?.[0] ?? name, value]);
  }

  const active: [string, string][] = [];
  for (const [name, value] of byName.values()) {
    if (value === false || value === "") continue;
    assertValidHeader(name, value);
    active.push([name, value]);
  }
  return active;
}

export function helmet(headers: HelmetHeaderOptions = {}): HelmetHandler {
  // Resolve the active headers once, at construction time, so the per-request
  // hot path is a tight loop over a fixed list rather than re-filtering, and
  // so malformed configuration throws at startup rather than per request
  const active = resolveHeaders(headers, defaultHeaders);

  return (res) => {
    for (const [key, value] of active) {
      res.writeHeader(key, value);
    }
  };
}

export default helmet;
