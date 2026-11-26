import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { build } from "vite";

it("keeps fixture and workspace hooks on one React instance even with a nested install", async () => {
  const source = await readFile("scripts/test-browser-collection-renaming.mjs", "utf8");
  // Read the actual fixture setting so removing the fix breaks this check.
  const configured = source.match(/dedupe:\s*(\[[^\]]+\])/);
  expect(configured, "Native fixture must explicitly deduplicate React").not.toBeNull();
  const dedupe = JSON.parse(configured![1]) as string[];
  const root = await mkdtemp(path.join(tmpdir(), "renaming-react-resolution-"));
  const require = createRequire(import.meta.url);
  const reactRoot = path.dirname(require.resolve("react/package.json"));
  try {
    await mkdir(path.join(root, "node_modules"), { recursive: true });
    await mkdir(path.join(root, "component/node_modules"), { recursive: true });
    await symlink(await realpath(reactRoot), path.join(root, "node_modules/react"), "dir");
    // A physically separate copy models npm's publishing install, unlike the
    // workspace's pnpm links, which currently point at the same package.
    await cp(reactRoot, path.join(root, "component/node_modules/react"), { recursive: true });
    await writeFile(path.join(root, "index.js"),
      'import React from "react"; export function entryHook() { return React.useState(0); } export { componentHook } from "./component/index.js";');
    await writeFile(path.join(root, "component/index.js"),
      'import React from "react"; export function componentHook() { return React.useState(0); }');
    async function reactModules(packages: string[]) {
      const ids = new Set<string>();
      await build({
        root, configFile: false, envFile: false, logLevel: "silent",
        resolve: { dedupe: packages },
        plugins: [{
          name: "capture-react-instances",
          moduleParsed(info) {
            if (/[/\\]react[/\\]index\.js$/.test(info.id)) ids.add(info.id);
          },
        }],
        build: {
          write: false, minify: false,
          lib: { entry: path.join(root, "index.js"), formats: ["es"] },
        },
      });
      return [...ids];
    }
    expect(await reactModules([]), "Control must expose two physical React instances").toHaveLength(2);
    expect(await reactModules(dedupe), "Entry and component must share one React instance").toHaveLength(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 20_000);
