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
 * @param headers - overrides merged on top of {@link defaultHeaders}. Set a
 * value to `false` (or `""`) to suppress one of the defaults.
 * @returns a `(res, req) => void` function to call inside a route handler.
 *
 * @remarks
 * uWebSockets.js requires `res.writeHeader` to be called *before* the
 * response body is sent (`res.end` / `res.write`). Apply this at the top of
 * your handler. When using `res.cork`, call it inside the corked callback.
 *
 * @example
 * ```ts
 * app.any("/*", (res, req) => {
 *   helmet()(res, req);
 *   res.end("ok");
 * });
 * ```
 */
export function helmet(headers: HelmetHeaderOptions = {}): HelmetHandler {
  const merged: Record<string, string | false> = { ...defaultHeaders, ...headers };

  // Resolve the active headers once, at construction time, so the per-request
  // hot path is a tight loop over a fixed list rather than re-filtering
  const active = Object.entries(merged).filter(
    (entry): entry is [string, string] => entry[1] !== false && entry[1] !== "",
  );

  return (res) => {
    for (const [key, value] of active) {
      res.writeHeader(key, value);
    }
  };
}

export default helmet;
