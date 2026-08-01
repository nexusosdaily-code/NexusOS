/**
 * CI-pipeline integration guard.
 *
 * Reads `script/build.ts` as plain text and asserts that
 * `checkPreloads()` is both imported and explicitly called in the
 * production build path.  If a contributor removes either line the
 * test fails immediately — before the removal can ship.
 *
 * No build output is required; the file is read from source.
 */

import { readFile } from "fs/promises";
import path from "path";
import { describe, it, expect } from "vitest";

const BUILD_SCRIPT = path.resolve("script/build.ts");

describe("script/build.ts pipeline guard", () => {
  let src: string;

  // Read the file once and share across assertions.
  // Using a beforeAll-style approach via a top-level await isn't
  // supported in every vitest version, so we read lazily instead.
  async function getBuildSrc(): Promise<string> {
    if (!src) {
      src = await readFile(BUILD_SCRIPT, "utf-8");
    }
    return src;
  }

  it("imports checkPreloads from the check-preloads module", async () => {
    const content = await getBuildSrc();
    // Must import the function — either a named import or a namespace import.
    expect(content).toMatch(/checkPreloads/);
    expect(content).toMatch(/check-preloads/);
  });

  it("calls checkPreloads() in the build function body", async () => {
    const content = await getBuildSrc();
    // The call must appear as `checkPreloads()` or `await checkPreloads()`.
    expect(content).toMatch(/\bcheckPreloads\s*\(\s*\)/);
  });

  it("the checkPreloads call is awaited (not fire-and-forget)", async () => {
    const content = await getBuildSrc();
    // The call should be preceded by `await` so a thrown error actually
    // fails the build rather than producing an unhandled rejection.
    expect(content).toMatch(/await\s+checkPreloads\s*\(\s*\)/);
  });
});

// ─── bundle-size check guard ──────────────────────────────────────────────────

const VITE_CONFIG = path.resolve("vite.config.ts");

// ── Structural helpers ────────────────────────────────────────────────────────

/**
 * Walk `content` starting at `openPos` (which must point to an opening `{`)
 * and return the text between that brace and its matching closing brace,
 * handling arbitrary nesting.  Returns null if the braces are unbalanced.
 */
function extractBalancedBlock(content: string, openPos: number): string | null {
  let depth = 0;
  for (let i = openPos; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) return content.slice(openPos + 1, i);
    }
  }
  return null; // unbalanced
}

/**
 * Locate the named `function <name>(…) {` declaration in `content` and
 * return the text of its body (between the outer braces), or null.
 */
function extractNamedFunctionBody(
  content: string,
  name: string,
): string | null {
  const re = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*:\\s*\\w+\\s*\\{|function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`);
  const m = content.match(re);
  if (!m || m.index === undefined) return null;
  // Find the opening brace of the function body.
  const openPos = content.indexOf("{", m.index + m[0].indexOf("("));
  if (openPos === -1) return null;
  return extractBalancedBlock(content, openPos);
}

/**
 * Within a text block, find the first `closeBundle(…) {` method body.
 */
function extractCloseBundleBody(block: string): string | null {
  const m = block.match(/closeBundle\s*\(\s*\)\s*\{/);
  if (!m || m.index === undefined) return null;
  const openPos = m.index + m[0].length - 1;
  return extractBalancedBlock(block, openPos);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("vite.config.ts bundle-size check guard", () => {
  let cfg: string;

  async function getViteConfig(): Promise<string> {
    if (!cfg) {
      cfg = await readFile(VITE_CONFIG, "utf-8");
    }
    return cfg;
  }

  it("defines a bundleSizeCheckPlugin factory function", async () => {
    const content = await getViteConfig();
    expect(content).toMatch(/function\s+bundleSizeCheckPlugin\s*\(/);
  });

  it("bundleSizeCheckPlugin has a closeBundle hook", async () => {
    const content = await getViteConfig();
    const pluginBody = extractNamedFunctionBody(content, "bundleSizeCheckPlugin");
    expect(
      pluginBody,
      "bundleSizeCheckPlugin function body not found in vite.config.ts",
    ).not.toBeNull();
    const hookBody = extractCloseBundleBody(pluginBody!);
    expect(
      hookBody,
      "closeBundle hook not found inside bundleSizeCheckPlugin",
    ).not.toBeNull();
  });

  it("bundleSizeCheckPlugin's closeBundle hook imports from check-bundle-size", async () => {
    const content = await getViteConfig();
    const pluginBody = extractNamedFunctionBody(content, "bundleSizeCheckPlugin");
    expect(pluginBody, "bundleSizeCheckPlugin body not found").not.toBeNull();
    const hookBody = extractCloseBundleBody(pluginBody!);
    expect(hookBody, "closeBundle hook not found").not.toBeNull();
    // The dynamic import must live inside the hook — removing it while leaving
    // the call (or vice-versa) still fails one of the two assertions.
    expect(hookBody!).toMatch(/check-bundle-size/);
  });

  it("bundleSizeCheckPlugin's closeBundle hook awaits checkBundleSize()", async () => {
    const content = await getViteConfig();
    const pluginBody = extractNamedFunctionBody(content, "bundleSizeCheckPlugin");
    expect(pluginBody, "bundleSizeCheckPlugin body not found").not.toBeNull();
    const hookBody = extractCloseBundleBody(pluginBody!);
    expect(hookBody, "closeBundle hook not found").not.toBeNull();
    // Both conditions must hold simultaneously, scoped to bundleSizeCheckPlugin's
    // own closeBundle hook — not any other plugin's hook.
    expect(hookBody!).toMatch(/await\s+checkBundleSize\s*\(\s*\)/);
  });

  it("bundleSizeCheckPlugin() is invoked inside the defineConfig plugins array", async () => {
    const content = await getViteConfig();
    // Extract the defineConfig argument block.
    const dcMatch = content.match(/defineConfig\s*\(\s*\{/);
    expect(dcMatch, "defineConfig({ not found").not.toBeNull();
    const openPos = content.indexOf("{", dcMatch!.index!);
    const configBody = extractBalancedBlock(content, openPos);
    expect(configBody, "defineConfig body not balanced").not.toBeNull();
    // The plugins property must contain a bundleSizeCheckPlugin() call.
    expect(configBody!).toMatch(/bundleSizeCheckPlugin\s*\(\s*\)/);
  });

  it("the plugin is restricted to the build phase (apply: 'build')", async () => {
    const content = await getViteConfig();
    const pluginBody = extractNamedFunctionBody(content, "bundleSizeCheckPlugin");
    expect(pluginBody, "bundleSizeCheckPlugin body not found").not.toBeNull();
    // apply:"build" must be declared inside the factory, not in an unrelated plugin.
    expect(pluginBody!).toMatch(/apply\s*:\s*["']build["']/);
  });
});

describe("script/build.ts calls viteBuild (which triggers the bundle-size plugin)", () => {
  let src: string;

  async function getBuildSrc(): Promise<string> {
    if (!src) {
      src = await readFile(BUILD_SCRIPT, "utf-8");
    }
    return src;
  }

  it("imports viteBuild from vite", async () => {
    const content = await getBuildSrc();
    // viteBuild must be imported so it can be called in the build function.
    expect(content).toMatch(/viteBuild/);
    expect(content).toMatch(/["']vite["']/);
  });

  it("awaits viteBuild() so the closeBundle plugin hook cannot be skipped", async () => {
    const content = await getBuildSrc();
    // Must be awaited — a fire-and-forget call would not block on the plugin
    // hook, so a bundle-size violation could silently pass.
    expect(content).toMatch(/await\s+viteBuild\s*\(\s*\)/);
  });
});

// ─── critical-chunk preload plugin guard ──────────────────────────────────────

describe("vite.config.ts critical-chunk preload plugin guard", () => {
  let cfg: string;

  async function getViteConfig(): Promise<string> {
    if (!cfg) {
      cfg = await readFile(VITE_CONFIG, "utf-8");
    }
    return cfg;
  }

  it("defines a criticalChunkPreloadPlugin factory function", async () => {
    const content = await getViteConfig();
    expect(content).toMatch(/function\s+criticalChunkPreloadPlugin\s*\(/);
  });

  it("criticalChunkPreloadPlugin has a generateBundle hook", async () => {
    const content = await getViteConfig();
    const pluginBody = extractNamedFunctionBody(
      content,
      "criticalChunkPreloadPlugin",
    );
    expect(
      pluginBody,
      "criticalChunkPreloadPlugin function body not found in vite.config.ts",
    ).not.toBeNull();
    expect(pluginBody!).toMatch(/generateBundle\s*\(/);
  });

  it("criticalChunkPreloadPlugin() is invoked inside the defineConfig plugins array", async () => {
    const content = await getViteConfig();
    // Extract the defineConfig argument block.
    const dcMatch = content.match(/defineConfig\s*\(\s*\{/);
    expect(dcMatch, "defineConfig({ not found").not.toBeNull();
    const openPos = content.indexOf("{", dcMatch!.index!);
    const configBody = extractBalancedBlock(content, openPos);
    expect(configBody, "defineConfig body not balanced").not.toBeNull();
    // The plugins property must contain a criticalChunkPreloadPlugin() call.
    expect(configBody!).toMatch(/criticalChunkPreloadPlugin\s*\(\s*\)/);
  });
});
