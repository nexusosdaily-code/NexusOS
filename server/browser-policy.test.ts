import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { browserContentSecurityPolicy } from "./browser-policy";

it("allows only same-origin script files in production", () => {
  const policy = browserContentSecurityPolicy(true).split("; ");
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("script-src-attr 'none'");
  expect(policy).toContain("frame-ancestors 'self'");
  expect(policy.find(d => d.startsWith("script-src "))).not.toMatch(/unsafe-inline|unsafe-eval|https:|data:|blob:/);
});

it("retains Vite development support without enabling inline HTML handlers", () => {
  const policy = browserContentSecurityPolicy(false);
  expect(policy).toContain("'unsafe-eval'");
  expect(policy).toContain("script-src-attr 'none'");
});

it("the HTML shell has no executable inline scripts or event attributes", () => {
  const html = readFileSync("client/index.html", "utf8");
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (script[1].includes('type="application/ld+json"')) {
      expect(() => JSON.parse(script[2])).not.toThrow();
    } else {
      expect(script[1]).toMatch(/\bsrc="/);
      expect(script[2].trim()).toBe("");
    }
  }
  expect(html).not.toMatch(/\son[a-z]+\s*=/i);
  expect(html).toContain('src="/browser-bootstrap.js"');
});
