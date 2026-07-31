/**
 * compliance_public.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Confirms that /constitution/compliance is publicly accessible without
 * authentication — both at the static-serving layer (returns 200 rather than
 * falling through to a 404 shell) and at the SEO-metadata layer (server injects
 * the correct canonical URL so crawlers can index the live compliance state).
 *
 * These tests require no live database or network — all imports are pure
 * module reads against already-built source.
 */

import { describe, it, expect } from "vitest";
import { isPublicSpaPath } from "./static";
import { ROUTE_META, resolveMeta, injectMeta } from "./seo-meta";

const COMPLIANCE_PATH = "/constitution/compliance";
const EXPECTED_CANONICAL = "https://wnsp.io/constitution/compliance";

// ── 1. Public-path allowlist ──────────────────────────────────────────────────

describe("isPublicSpaPath — /constitution/compliance", () => {
  it("returns true so production static serving sends HTTP 200", () => {
    expect(isPublicSpaPath(COMPLIANCE_PATH)).toBe(true);
  });

  it("does not treat sub-paths as public (no accidental wildcard)", () => {
    expect(isPublicSpaPath("/constitution/compliance/extra")).toBe(false);
  });

  it("still marks the parent /constitution path as public", () => {
    expect(isPublicSpaPath("/constitution")).toBe(true);
  });
});

// ── 2. Server-side SEO metadata ───────────────────────────────────────────────

describe("ROUTE_META — /constitution/compliance entry", () => {
  it("has a ROUTE_META entry for the compliance path", () => {
    expect(ROUTE_META[COMPLIANCE_PATH]).toBeDefined();
  });

  it("sets the correct canonical URL", () => {
    expect(ROUTE_META[COMPLIANCE_PATH].canonical).toBe(EXPECTED_CANONICAL);
  });

  it("has a non-empty title referencing NexusOS", () => {
    expect(ROUTE_META[COMPLIANCE_PATH].title).toMatch(/NexusOS/i);
  });

  it("has a description mentioning constitutional article codes", () => {
    const desc = ROUTE_META[COMPLIANCE_PATH].description ?? "";
    expect(desc).toMatch(/C-000[12]/);
  });
});

// ── 3. resolveMeta — path resolution ─────────────────────────────────────────

describe("resolveMeta — /constitution/compliance", () => {
  it("returns metadata (not null) for an unauthenticated crawler request", () => {
    const meta = resolveMeta("wnsp.io", COMPLIANCE_PATH);
    expect(meta).not.toBeNull();
  });

  it("resolves the correct canonical URL", () => {
    const meta = resolveMeta("wnsp.io", COMPLIANCE_PATH);
    expect(meta?.canonical).toBe(EXPECTED_CANONICAL);
  });

  it("resolves the same metadata when the path has a trailing slash", () => {
    const meta = resolveMeta("wnsp.io", "/constitution/compliance/");
    expect(meta).not.toBeNull();
    expect(meta?.canonical).toBe(EXPECTED_CANONICAL);
  });
});

// ── 4. injectMeta — canonical tag present in HTML output ─────────────────────

describe("injectMeta — canonical injection for /constitution/compliance", () => {
  const SHELL_HTML = `<!DOCTYPE html><html><head>
<title>NexusOS</title>
<link rel="canonical" href="https://wnsp.io/" />
<meta property="og:url" content="https://wnsp.io/" />
</head><body><div id="root"></div></body></html>`;

  it("injects the compliance canonical link into the HTML shell", () => {
    const result = injectMeta(SHELL_HTML, "wnsp.io", COMPLIANCE_PATH);
    expect(result).toContain(EXPECTED_CANONICAL);
  });

  it("injects the page title into the HTML shell", () => {
    const result = injectMeta(SHELL_HTML, "wnsp.io", COMPLIANCE_PATH);
    expect(result).toContain("Live Protocol Compliance");
  });
});
