import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parse } from "yaml";

it("requires the full dependency-worker matrix after the locked engines and host libraries", () => {
  const workflow = parse(readFileSync(".github/workflows/p2p-wave-vault.yml", "utf8"));
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const job = workflow.jobs.safeguards;
  expect(workflow.on).toHaveProperty("pull_request");
  expect(job["runs-on"]).toBe("ubuntu-24.04");
  expect(job["timeout-minutes"]).toBe(20);
  const steps = job.steps;
  const install = steps.findIndex((step: any) =>
    step.run === "node node_modules/playwright-core/cli.js install --with-deps chromium firefox webkit");
  const dependencies = steps.findIndex((step: any) =>
    step.run === "npm ci --no-audit --no-fund");
  const workers = steps.filter((step: any) =>
    step.run === "npm run test:browser-complete-collections");
  expect(dependencies).toBeGreaterThanOrEqual(0);
  expect(install).toBeGreaterThan(dependencies);
  expect(workers).toHaveLength(1);
  expect(steps.indexOf(workers[0])).toBeGreaterThan(install);
  expect(workers[0].if).toBe("${{ !cancelled() }}");
  // No engine argument means Chromium, Firefox AND WebKit. Partial modes,
  // failure suppression and host-validation overrides must not weaken this.
  expect(manifest.scripts["test:browser-complete-collections"]).toBe(
    "node_modules/.bin/node scripts/test-browser-collection-renaming.mjs --complete-apis-only",
  );
  for (const scope of [workflow, job, steps[install], workers[0]]) {
    expect(scope["continue-on-error"]).toBeUndefined();
    expect(scope.env ?? {}).not.toHaveProperty("PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS");
    expect(scope.env ?? {}).not.toHaveProperty("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD");
  }
});
