import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("handles repeated parent/globstar segments at optimization level 2 within process limits", () => {
  const child = spawnSync(process.execPath, [
    "--max-old-space-size=96", "--input-type=module", "-e",
    `import { Minimatch } from "minimatch";
     const pattern = Array(64).fill("**/..").join("/") + "/target";
     const matcher = new Minimatch(pattern, { optimizationLevel: 2 });
     console.log(JSON.stringify({ result: matcher.match("target") }));`,
  ], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    encoding: "utf8", timeout: 5_000, maxBuffer: 2048,
    env: { PATH: process.env.PATH, NODE_NO_WARNINGS: "1" },
  });
  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  expect(child.status).toBe(0);
  expect(child.stderr).toBe("");
  expect(JSON.parse(child.stdout)).toEqual({ result: false });
}, 10_000);
