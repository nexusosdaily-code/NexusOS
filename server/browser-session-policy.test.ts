import { afterEach, describe, expect, it, vi } from "vitest";
import type { IncomingMessage } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { browserSessionRequestGuard, browserSocketToken } from "./browser-session-policy";

afterEach(() => vi.unstubAllEnvs());
function request(headers: Record<string, string> = {}) {
  return { headers: { host: "app.example", ...headers } } as IncomingMessage;
}

describe("cookie sessions and browser request origin", () => {
  it("uses the HttpOnly handshake cookie, not URL credentials", () => {
    expect(browserSocketToken(request({ origin: "https://app.example", cookie: "other=x; auth_token=synthetic" }))).toBe("synthetic");
    expect(browserSocketToken({ ...request({ origin: "https://app.example" }), url: "/ws/signaling?token=synthetic" } as IncomingMessage)).toBeUndefined();
  });
  it.each([
    {},
    { origin: "https://evil.example" },
    { origin: "null" },
    { origin: "https://app.example.evil" },
    { origin: "https://app.example:444" },
    { origin: "https://app.example", "sec-fetch-site": "cross-site" },
  ])("rejects unproven or cross-origin socket access: %j", headers => {
    expect(browserSocketToken(request({ cookie: "auth_token=synthetic", ...headers }))).toBeUndefined();
  });
  it("rejects plaintext browser origins in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(browserSocketToken(request({ origin: "http://app.example", cookie: "auth_token=synthetic" }))).toBeUndefined();
  });
  it.each(["auth_token=%ZZ", "auth_token=a; auth_token=b", "auth_token="])("rejects ambiguous or malformed cookies: %s", cookie => {
    expect(browserSocketToken(request({ origin: "https://app.example", cookie }))).toBeUndefined();
  });
  it.each([
    ["POST", "/api/contracts", true, "https://evil.example", 403],
    ["DELETE", "/api/contracts/one", true, "https://evil.example", 403],
    ["POST", "/api/auth/wif-login", false, "https://evil.example", 403],
    ["POST", "/api/auth/logout", true, "https://evil.example", 403],
    ["POST", "/api/contracts", true, "https://app.example", 200],
    ["POST", "/api/auth/wif-login", false, "https://app.example", 200],
    ["GET", "/api/contracts", true, "https://evil.example", 200],
    ["POST", "/api/webhook", false, "https://external.example", 200],
  ] as const)("guards %s %s with cookie=%s origin=%s", (method, path, cookie, origin, expected) => {
    const next = vi.fn();
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    browserSessionRequestGuard({
      ...request({ origin }), method, path, cookies: cookie ? { auth_token: "synthetic" } : {},
    } as any, res, next);
    expect(next).toHaveBeenCalledTimes(expected === 200 ? 1 : 0);
    if (expected === 403) expect(res.status).toHaveBeenCalledWith(403);
  });
});

it("keeps browser session credentials out of storage, bearer headers and socket URLs", () => {
  function files(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? files(path) : /\.[jt]sx?$/.test(path) ? [path] : [];
    });
  }
  // Preserve all three checks without thousands of assertion-context copies
  // of large source files during the parallel build/test gate.
  const forbidden = [
    ["browser credential storage", /(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(["']auth_token["']/],
    ["socket URL credential", /[?&]token=\$\{/],
    ["browser bearer credential", /Bearer \$\{(?:token|_token)\}/],
  ] as const;
  const violations: string[] = [];
  for (const path of files("client/src")) {
    const source = readFileSync(path, "utf8");
    for (const [name, pattern] of forbidden) {
      if (pattern.test(source)) violations.push(`${path}: ${name}`);
    }
  }
  expect(violations).toEqual([]);
});
