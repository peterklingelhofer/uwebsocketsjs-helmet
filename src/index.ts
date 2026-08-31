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
  /** Present on a real `HttpResponse`; optional so partial mocks still satisfy this */
  writeStatus?(status: string): unknown;
}

/**
 * A map of HTTP response header names to their values.
 *
 * Pass this to {@link helmet} to override or extend the secure defaults.
 * Set a value to `false` or `""` to omit that header entirely.
 */
export type HelmetHeaderOptions = Record<string, string | false>;

/**
 * A uWebSockets.js route handler that writes security headers onto the response.
 *
 * The second argument is the request, which is ignored, or an HTTP status such
 * as `"404 Not Found"`. Passing a status writes it before the headers, which is
 * the order uWebSockets.js requires; see {@link helmet}.
 */
export type HelmetHandler = (res: HelmetResponse, statusOrReq?: unknown) => void;

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

  return (res, statusOrReq) => {
    // a status has to reach the socket before any header, and the request
    // object callers pass through from the route is never a string
    if (typeof statusOrReq === "string") {
      res.writeStatus?.(statusOrReq);
    }
    for (const [key, value] of active) {
      res.writeHeader(key, value);
    }
  };
}

/**
 * Route methods on a uWebSockets.js `TemplatedApp` that answer an HTTP request.
 *
 * `ws` is deliberately absent: writing a header into an upgrade response
 * commits `200 OK` and breaks the `101 Switching Protocols` handshake.
 */
const ROUTE_METHODS = [
  "get",
  "post",
  "put",
  "del",
  "patch",
  "options",
  "head",
  "trace",
  "connect",
  "any",
] as const;

/** Response methods that commit the status line and so must flush our headers first. */
const COMMITTING_METHODS = ["write", "end", "endWithoutBody", "tryEnd"] as const;

type CommittingMethod = (typeof COMMITTING_METHODS)[number];

/** Marks an app as already wrapped, so a second call cannot double up the headers. */
const SECURED = Symbol.for("uwebsocketsjs-helmet.secured");

/** The mutable view of a response that {@link deferHeaders} patches. */
interface PatchableResponse extends HelmetResponse {
  write?(...args: unknown[]): unknown;
  end?(...args: unknown[]): unknown;
  endWithoutBody?(...args: unknown[]): unknown;
  tryEnd?(...args: unknown[]): unknown;
}

/**
 * Arrange for `active` to be written at the last correct moment.
 *
 * uWebSockets.js commits the status line on the first `writeHeader`, so
 * writing headers up front would discard any later `writeStatus` and break a
 * WebSocket upgrade. Instead the headers are held until the handler does
 * something that commits the response: writes its own status (ours follow it),
 * writes its own header, or writes a body. `res.upgrade()` does none of those,
 * so an upgrade never has headers written into it.
 *
 * Once flushed, the native methods are restored, so the rest of the response,
 * including any streaming writes, runs with no wrapper in the way.
 */
function deferHeaders(res: PatchableResponse, active: readonly [string, string][]): void {
  const writeHeader = res.writeHeader;
  const writeStatus = res.writeStatus;
  const committing = new Map<CommittingMethod, (...args: unknown[]) => unknown>();
  for (const name of COMMITTING_METHODS) {
    const original = res[name];
    if (typeof original === "function") committing.set(name, original);
  }

  let flushed = false;
  const flush = (): void => {
    if (flushed) return;
    flushed = true;

    res.writeHeader = writeHeader;
    if (writeStatus) res.writeStatus = writeStatus;
    for (const [name, original] of committing) res[name] = original;

    for (const [key, value] of active) {
      writeHeader.call(res, key, value);
    }
  };

  if (writeStatus) {
    res.writeStatus = (status: string): unknown => {
      const result = writeStatus.call(res, status);
      flush();
      return result;
    };
  }

  res.writeHeader = (key: string, value: string): unknown => {
    flush();
    return writeHeader.call(res, key, value);
  };

  for (const [name, original] of committing) {
    res[name] = (...args: unknown[]): unknown => {
      flush();
      return original.apply(res, args);
    };
  }
}

/**
 * Apply security headers to every HTTP route on a uWebSockets.js app, the way
 * `app.use(helmet())` does for Express.
 *
 * This is the recommended way to use this package. Unlike calling
 * {@link helmet} by hand it cannot be applied in the wrong order: headers are
 * written only once the handler commits the response, so a `res.writeStatus`
 * anywhere in the handler is preserved, and WebSocket upgrades are untouched.
 *
 * The app is wrapped in place and returned. `app.ws(...)` is left alone.
 *
 * @param app - a uWebSockets.js `TemplatedApp` from `App()` or `SSLApp()`
 * @param headers - overrides merged on top of {@link defaultHeaders}, exactly
 * as for {@link helmet}
 * @returns the same app, for convenience
 * @throws TypeError if the app has already been wrapped, or if the headers are
 * malformed
 *
 * @example
 * ```ts
 * const app = secureApp(App());
 *
 * app.get("/missing", (res) => {
 *   res.writeStatus("404 Not Found"); // preserved
 *   res.end("nope");
 * });
 * ```
 */
export function secureApp<T extends object>(app: T, headers: HelmetHeaderOptions = {}): T {
  const target = app as unknown as Record<PropertyKey, unknown>;
  if (target[SECURED] === true) {
    throw new TypeError(
      "secureApp() has already been applied to this app; applying it twice would send every header twice",
    );
  }

  const active = resolveHeaders(headers, defaultHeaders);

  for (const method of ROUTE_METHODS) {
    const route = target[method];
    if (typeof route !== "function") continue;
    target[method] = (pattern: string, handler: (...args: never[]) => unknown): unknown =>
      route.call(app, pattern, (res: PatchableResponse, req: unknown) => {
        deferHeaders(res, active);
        return handler(res as never, req as never);
      });
  }

  target[SECURED] = true;
  return app;
}

export default helmet;
