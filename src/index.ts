import type { HttpRequest, HttpResponse } from "uWebSockets.js";

export type HelmetHeaderOptions = {
  [key: string]: string;
};

const defaultHeaders: HelmetHeaderOptions = {
  "Content-Security-Policy": "default-src 'self'",
  "X-DNS-Prefetch-Control": "off",
  "Expect-CT": "max-age=86400, enforce",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Download-Options": "noopen",
  "X-Content-Type-Options": "nosniff",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Referrer-Policy": "no-referrer",
  "X-XSS-Protection": "0"
};


export function helmet(headers: HelmetHeaderOptions = {}) {
  const mergedHeaders = { ...defaultHeaders, ...headers };

  return function (res: HttpResponse, req: HttpRequest) {
    for (const [key, value] of Object.entries(mergedHeaders)) {
      res.writeHeader(key, value as string);
    }
  };
}
