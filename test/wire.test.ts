import type { TemplatedApp } from "uWebSockets.js";
import uWS from "uWebSockets.js";
import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defaultHeaders, helmet, secureApp } from "../src/index.js";

/**
 * These tests drive a real uWebSockets.js server and read the raw bytes off
 * the socket. The unit tests in index.test.ts use a `{ writeHeader }` mock,
 * which by construction cannot observe the status line, header ordering,
 * duplicate headers, or whether a WebSocket upgrade actually completed
 */

const PORT = 39_101;
const SECURED_PORT = 39_102;

/** Sends a hand-written request and resolves with the raw response text */
function raw(
  path: string,
  extraHeaders = "",
  untilHeadersOnly = false,
  port = PORT,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1", () => {
      socket.write(
        `GET ${path} HTTP/1.1\r\nHost: localhost\r\n${extraHeaders}Connection: close\r\n\r\n`,
      );
    });
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      // an upgraded socket never closes, so stop at the end of the header block
      if (untilHeadersOnly && buffer.includes("\r\n\r\n")) {
        socket.destroy();
        resolve(buffer);
      }
    });
    socket.on("close", () => resolve(buffer));
    socket.on("error", reject);
  });
}

/** The status line plus every header, as `Name: value` strings */
function headerLines(response: string): string[] {
  const [head] = response.split("\r\n\r\n");
  return (head ?? "").split("\r\n");
}

function statusLine(response: string): string {
  return headerLines(response)[0] ?? "";
}

/** Every value sent for `name`, case-insensitively. Length > 1 means duplicates */
function valuesOf(response: string, name: string): string[] {
  return headerLines(response)
    .slice(1)
    .filter((line) => line.slice(0, line.indexOf(":")).toLowerCase() === name.toLowerCase())
    .map((line) => line.slice(line.indexOf(":") + 1).trim());
}

const WS_HANDSHAKE =
  "Upgrade: websocket\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n";

let app: TemplatedApp;
let securedApp: TemplatedApp;
let token: unknown;
let securedToken: unknown;

beforeAll(async () => {
  app = uWS.App();

  app.get("/defaults", (res) => {
    helmet()(res);
    res.end("ok");
  });

  app.get("/custom", (res) => {
    helmet({ "X-Frame-Options": "DENY", "Permissions-Policy": "geolocation=()" })(res);
    res.end("ok");
  });

  app.get("/suppressed", (res) => {
    helmet({ "Strict-Transport-Security": false })(res);
    res.end("ok");
  });

  // status written first, which is the order uWebSockets.js requires
  app.get("/status-first", (res) => {
    res.writeStatus("404 Not Found");
    helmet()(res);
    res.end("nope");
  });

  app.get("/case-override", (res) => {
    helmet({ "x-frame-options": "DENY" })(res);
    res.end("ok");
  });

  app.ws("/ws", {
    upgrade: (res, req, context) => {
      res.upgrade(
        {},
        req.getHeader("sec-websocket-key"),
        req.getHeader("sec-websocket-protocol"),
        req.getHeader("sec-websocket-extensions"),
        context,
      );
    },
    open: () => {},
  });

  securedApp = secureApp(uWS.App());

  // the status is written after the point at which a bare helmet() call would
  // already have committed 200 OK
  securedApp.get("/late-status", (res) => {
    res.writeStatus("404 Not Found");
    res.end("nope");
  });

  securedApp.get("/no-status", (res) => {
    res.end("ok");
  });

  securedApp.get("/chained", (res) => {
    res.writeStatus("201 Created").writeHeader("X-User", "u").end("made");
  });

  securedApp.get("/corked", (res) => {
    res.cork(() => {
      res.writeStatus("418 I'm a teapot");
      res.end("tea");
    });
  });

  securedApp.get("/own-header-first", (res) => {
    res.writeHeader("Content-Type", "application/json");
    res.end("{}");
  });

  securedApp.get("/streamed", (res) => {
    res.writeStatus("206 Partial Content");
    res.write("one");
    res.write("two");
    res.end("three");
  });

  securedApp.ws("/ws", {
    upgrade: (res, req, context) => {
      res.upgrade(
        {},
        req.getHeader("sec-websocket-key"),
        req.getHeader("sec-websocket-protocol"),
        req.getHeader("sec-websocket-extensions"),
        context,
      );
    },
    open: () => {},
  });

  await new Promise<void>((resolve, reject) => {
    app.listen(PORT, (listenToken) => {
      token = listenToken;
      if (listenToken) resolve();
      else reject(new Error(`failed to listen on ${PORT}`));
    });
  });

  await new Promise<void>((resolve, reject) => {
    securedApp.listen(SECURED_PORT, (listenToken) => {
      securedToken = listenToken;
      if (listenToken) resolve();
      else reject(new Error(`failed to listen on ${SECURED_PORT}`));
    });
  });
});

afterAll(() => {
  if (token) uWS.us_listen_socket_close(token as never);
  if (securedToken) uWS.us_listen_socket_close(securedToken as never);
});

describe("wire format", () => {
  it("writes every default header exactly once", async () => {
    const response = await raw("/defaults");

    for (const [name, value] of Object.entries(defaultHeaders)) {
      expect(valuesOf(response, name), `${name} should be sent exactly once`).toEqual([value]);
    }
  });

  it("responds 200 OK when the handler writes no status", async () => {
    expect(statusLine(await raw("/defaults"))).toBe("HTTP/1.1 200 OK");
  });

  it("applies overrides and additions on the wire without duplicating them", async () => {
    const response = await raw("/custom");

    expect(valuesOf(response, "X-Frame-Options")).toEqual(["DENY"]);
    expect(valuesOf(response, "Permissions-Policy")).toEqual(["geolocation=()"]);
  });

  it("omits a header suppressed with false", async () => {
    expect(valuesOf(await raw("/suppressed"), "Strict-Transport-Security")).toEqual([]);
  });

  it("preserves a status written before the headers", async () => {
    const response = await raw("/status-first");

    expect(statusLine(response)).toBe("HTTP/1.1 404 Not Found");
    expect(valuesOf(response, "X-Content-Type-Options")).toEqual(["nosniff"]);
  });

  it("completes a WebSocket handshake with 101", async () => {
    expect(statusLine(await raw("/ws", WS_HANDSHAKE, true))).toBe(
      "HTTP/1.1 101 Switching Protocols",
    );
  });

  it("sends one header, not two, when an override differs only by case", async () => {
    const response = await raw("/case-override");

    expect(valuesOf(response, "X-Frame-Options")).toEqual(["DENY"]);
  });

  it("never emits a header twice", async () => {
    const names = headerLines(await raw("/defaults"))
      .slice(1)
      .map((line) => line.slice(0, line.indexOf(":")).toLowerCase())
      // uWebSockets.js sends its own banner, which is not ours to control
      .filter((name) => name !== "uwebsockets");

    expect(new Set(names).size).toBe(names.length);
  });
});

describe("secureApp on the wire", () => {
  /** Requests the wrapped app rather than the hand-applied one */
  const secured = (path: string, extraHeaders = "", untilHeadersOnly = false) =>
    raw(path, extraHeaders, untilHeadersOnly, SECURED_PORT);

  it("preserves a status written anywhere in the handler", async () => {
    const response = await secured("/late-status");

    expect(statusLine(response)).toBe("HTTP/1.1 404 Not Found");
    expect(valuesOf(response, "X-Content-Type-Options")).toEqual(["nosniff"]);
  });

  it("still answers 200 OK when no status is written", async () => {
    const response = await secured("/no-status");

    expect(statusLine(response)).toBe("HTTP/1.1 200 OK");
    expect(valuesOf(response, "X-Frame-Options")).toEqual(["SAMEORIGIN"]);
  });

  it("writes every default header exactly once", async () => {
    const response = await secured("/no-status");

    for (const [name, value] of Object.entries(defaultHeaders)) {
      expect(valuesOf(response, name), `${name} should be sent exactly once`).toEqual([value]);
    }
  });

  it("keeps writeStatus chainable", async () => {
    const response = await secured("/chained");

    expect(statusLine(response)).toBe("HTTP/1.1 201 Created");
    expect(valuesOf(response, "X-User")).toEqual(["u"]);
    expect(valuesOf(response, "X-Frame-Options")).toEqual(["SAMEORIGIN"]);
  });

  it("works inside res.cork", async () => {
    const response = await secured("/corked");

    expect(statusLine(response)).toBe("HTTP/1.1 418 I'm a teapot");
    expect(valuesOf(response, "Referrer-Policy")).toEqual(["no-referrer"]);
  });

  it("does not duplicate a header the handler writes itself", async () => {
    const response = await secured("/own-header-first");

    expect(valuesOf(response, "Content-Type")).toEqual(["application/json"]);
    expect(valuesOf(response, "X-Frame-Options")).toEqual(["SAMEORIGIN"]);
  });

  it("writes the headers once across a streamed body", async () => {
    const response = await secured("/streamed");

    expect(statusLine(response)).toBe("HTTP/1.1 206 Partial Content");
    expect(valuesOf(response, "X-Frame-Options")).toEqual(["SAMEORIGIN"]);
    // res.write puts uWebSockets.js into chunked mode, so decode the chunks
    const body = response.split("\r\n\r\n").slice(1).join("\r\n\r\n");
    const chunks = [...body.matchAll(/^[0-9a-f]+\r\n(.*)$/gm)].map((match) => match[1]);
    expect(chunks.join("")).toBe("onetwothree");
  });

  it("leaves the WebSocket handshake intact", async () => {
    const response = await secured("/ws", WS_HANDSHAKE, true);

    expect(statusLine(response)).toBe("HTTP/1.1 101 Switching Protocols");
    // security headers are meaningless on a 101 and would break the handshake
    expect(valuesOf(response, "X-Frame-Options")).toEqual([]);
    expect(valuesOf(response, "Content-Security-Policy")).toEqual([]);
  });
});
