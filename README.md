# uWebSockets.js Helmet

A zero-dependency security headers middleware for [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js), similar to [Helmet](https://github.com/helmetjs/helmet) for Express and [@fastify/helmet](https://github.com/fastify/fastify-helmet) for Fastify.

It writes a curated set of secure-by-default HTTP response headers (matching Helmet 8's defaults) onto a uWebSockets.js response, and lets you override, extend, or suppress any of them.

## Installation

```sh
npm i uwebsocketsjs-helmet
# or
pnpm add uwebsocketsjs-helmet
# or
yarn add uwebsocketsjs-helmet
# or
bun add uwebsocketsjs-helmet
```

`uWebSockets.js` is an optional peer dependency (used only for TypeScript types). Install it the way that project documents, replacing the tag with your desired [release](https://github.com/uNetworking/uWebSockets.js/releases):

```sh
npm i uWebSockets.js@uNetworking/uWebSockets.js#v20.51.0
```

The package ships both ESM and CommonJS builds, so `import` and `require` both work.

## Basic usage

```ts
import { App } from "uWebSockets.js";
import { helmet } from "uwebsocketsjs-helmet";

const app = App();

app.any("/*", (res, req) => {
  helmet()(res, req); // apply the default security headers
  res.end("ok");
});

app.listen(9001, (token) => {
  console.log(token ? "Listening on port 9001" : "Failed to listen on port 9001");
});
```

> uWebSockets.js requires headers to be written **before** the body. Call `helmet()` at the top of your handler, before `res.end`/`res.write`. When using `res.cork`, call it inside the corked callback.

## Custom headers

Pass overrides that are merged on top of the defaults. Set a value to `false` (or `""`) to suppress one of the defaults.

```ts
import { App } from "uWebSockets.js";
import { helmet, type HelmetHeaderOptions } from "uwebsocketsjs-helmet";

const customHeaders: HelmetHeaderOptions = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
  "X-Frame-Options": "DENY",          // override a default
  "Permissions-Policy": "geolocation=()", // add a header not in the defaults
  "Strict-Transport-Security": false, // suppress a default
};

const app = App();

app.any("/*", (res, req) => {
  helmet(customHeaders)(res, req);
  res.end("Hello from uWebSockets.js with custom security headers!");
});

app.listen(9001, () => {});
```

Build the handler once and reuse it for the hot path:

```ts
const secure = helmet(customHeaders);

app.any("/*", (res, req) => {
  secure(res, req);
  res.end("ok");
});
```

## Default headers

These mirror Helmet 8's defaults:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Origin-Agent-Cluster` | `?1` |
| `Referrer-Policy` | `no-referrer` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-DNS-Prefetch-Control` | `off` |
| `X-Download-Options` | `noopen` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Permitted-Cross-Domain-Policies` | `none` |
| `X-XSS-Protection` | `0` |

The exported `defaultHeaders` object is available if you want to inspect or extend it programmatically.

### Changes in 0.1.0

To stay aligned with current browser behaviour and Helmet 8:

- **Removed `Expect-CT`** — deprecated and removed from browsers (Helmet dropped it in v6).
- **Removed `Cross-Origin-Embedder-Policy`** — not a Helmet default; it breaks many sites and should be opted into deliberately.
- **`X-Frame-Options`** changed from `DENY` to `SAMEORIGIN` (Helmet's default).
- **`Strict-Transport-Security`** changed to `max-age=31536000; includeSubDomains` (1 year, no `preload`). HSTS `preload` is a long-term commitment that should be opted into deliberately.
- **`Content-Security-Policy`** expanded to Helmet's full default policy.

If you relied on the previous values, pass them explicitly via the options argument.

## Development

```sh
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

## License

MIT
