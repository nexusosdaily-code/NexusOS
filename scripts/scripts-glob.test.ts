/**
 * Smoke test that confirms the scripts/**‌/*.test.ts glob in vitest.config.ts
 * is resolved correctly during a full `npm run test:all` run.
 */
describe("scripts glob smoke test", () => {
  it("is picked up by the full test run", () => {
    expect(true).toBe(true);
  });
});
