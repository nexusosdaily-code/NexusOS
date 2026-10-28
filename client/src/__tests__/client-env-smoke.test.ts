/**
 * Smoke test: confirms the vitest environmentMatchGlobs config routes
 * client/**\/*.test.ts files into the happy-dom (browser-like) environment.
 *
 * If this test is ever silently skipped or run in a Node environment, the
 * `typeof window` check will fail, surfacing the misconfiguration immediately.
 */

describe("client test environment", () => {
  it("runs in a browser-like environment (window is defined)", () => {
    expect(typeof window).toBe("object");
  });

  it("window.document is available", () => {
    expect(typeof document).toBe("object");
  });
});
