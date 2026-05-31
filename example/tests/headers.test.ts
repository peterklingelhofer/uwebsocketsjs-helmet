import * as http from "node:http";
import { type ChildProcess, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const exampleDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function startServer(script: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const server = spawn("npx", ["tsx", `${script}.ts`], { cwd: exampleDir });
    server.stdout?.on("data", (data: Buffer) => {
      if (data.toString().includes("Listening to port 9001")) {
        resolve(server);
      }
    });
    server.stderr?.on("data", (data: Buffer) => {
      reject(new Error(`Server failed to start: ${data}`));
    });
    server.on("error", reject);
  });
}

function makeRequest(path: string): Promise<http.IncomingHttpHeaders> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "localhost", port: 9001, path }, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve(res.headers));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("uWebSockets.js Helmet (integration)", () => {
  let server: ChildProcess | undefined;

  afterEach(() => {
    server?.kill();
    server = undefined;
  });

  it("sets the default headers", async () => {
    server = await startServer("index");
    const headers = await makeRequest("/");

    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-dns-prefetch-control"]).toBe("off");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-xss-protection"]).toBe("0");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["origin-agent-cluster"]).toBe("?1");
    expect(headers).not.toHaveProperty("expect-ct");
    expect(headers).not.toHaveProperty("cross-origin-embedder-policy");
    expect(headers).not.toHaveProperty("x-powered-by");
  }, 30_000);

  it("sets custom headers", async () => {
    server = await startServer("customHeaders");
    const headers = await makeRequest("/");

    expect(headers["content-security-policy"]).toBe(
      "default-src 'self'; script-src 'self' 'unsafe-inline'",
    );
    expect(headers["x-frame-options"]).toBe("DENY");
  }, 30_000);
});
