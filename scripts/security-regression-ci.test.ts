import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { parse } from "yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
const suites = [
  "scripts/minimatch-security.test.ts",
  "scripts/check-disclosure-export.test.ts",
  "server/founder-access.test.ts",
  "scripts/seal-retry-glob.test.ts",
];

it("declares and locks the YAML parser instead of relying on the local install", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const declared = { ...manifest.dependencies, ...manifest.devDependencies }.yaml;
  expect(typeof declared).toBe("string");
  expect(declared.length).toBeGreaterThan(0);
  const locked = { ...lock.packages[""].dependencies, ...lock.packages[""].devDependencies };
  expect(locked.yaml).toBe(declared);
  expect(lock.packages["node_modules/yaml"].integrity).toMatch(/^sha512-/);
});

it("discovers every reviewed security suite in the server project run by the required build", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  expect(manifest.scripts.build).toContain("script/build.ts");
  const build = readFileSync(new URL("../script/build.ts", import.meta.url), "utf8");
  expect(build).toContain('execSync("npx vitest run --project server --project client --maxWorkers=2"');
  const child = spawnSync(process.execPath, [
    "node_modules/vitest/vitest.mjs", "list", ...suites,
    "--project", "server", "--filesOnly", "--json",
  ], {
    cwd: root, encoding: "utf8", timeout: 15_000, maxBuffer: 65_536,
    env: {
      PATH: process.env.PATH, CI: "true", WNSP_PUBLISH_BUILD: "1",
      DATABASE_URL: "postgresql://isolated_fixture:isolated_fixture@127.0.0.1:1/forbidden",
    },
  });
  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  expect(child.status).toBe(0);
  const discovered = JSON.parse(child.stdout) as { file: string; projectName: string }[];
  expect(discovered.map(item => ({
    file: item.file.replace(/\\/g, "/").slice(root.replace(/\\/g, "/").length),
    project: item.projectName,
  })).sort((a, b) => a.file.localeCompare(b.file))).toEqual(
    suites.map(file => ({ file, project: "server" })).sort((a, b) => a.file.localeCompare(b.file)),
  );
}, 20_000);

it("keeps the isolated Python privacy regression mandatory and bounded in the required build", () => {
  const workflow = parse(readFileSync(new URL("../.github/workflows/p2p-wave-vault.yml", import.meta.url), "utf8"));
  const job = workflow.jobs.build;
  expect(job.name).toBe("Types and isolated release build");
  expect(job.steps.some((step: { run?: string }) => step.run === "npm run build")).toBe(true);
  const steps = job.steps.filter((step: { name?: string }) =>
    step.name === "Synthetic physics privacy regression");
  expect(steps).toHaveLength(1);
  expect(steps[0].run).toBe("timeout 30s python3 -I tests/test_security_finding_triage.py");
  expect(steps[0].if).toBeUndefined();
  for (const scope of [workflow, job, steps[0]]) {
    expect(scope["continue-on-error"]).toBeUndefined();
  }
  expect(readFileSync(new URL("../tests/test_security_finding_triage.py", import.meta.url), "utf8"))
    .toContain("def test_energy_budget_output_stays_in_fixed_input_standalone_demo");
});
