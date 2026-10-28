import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkWaveVaultArtifact } from "./check-wave-vault-artifact";

// Public-output-only fixtures: never import the application or any database.
let out: string;
const hubKey = "src/pages/hub.tsx";
const vaultKey = "src/pages/wave-vault.tsx";
const manifest = () => ({
  "index.html": {
    file: "assets/index-NEW.js", isEntry: true,
    dynamicImports: [hubKey, vaultKey],
  },
  [hubKey]: { file: "assets/hub-NEW.js" },
  [vaultKey]: { file: "assets/wave-vault-NEW.js" },
});
const quick = '{label:"Wave Vault",href:"/wave-vault"}';
const destination = '{title:"Wave Vault",href:"/wave-vault"}';
const hub = (action = quick, item = destination) =>
  `const a=[${action}],b=[{label:"Data & Storage",items:[${item}]}];`;
const write = (file: string, data: string) => writeFile(path.join(out, file), data);
const writeManifest = (data = manifest()) => write(".vite/manifest.json", JSON.stringify(data));

beforeEach(async () => {
  out = await mkdtemp(path.join(tmpdir(), "wave-vault-release-"));
  await mkdir(path.join(out, "assets"));
  await mkdir(path.join(out, ".vite"));
  await writeManifest();
  await write("index.html", '<script type="module" src="/assets/index-NEW.js"></script><link rel="modulepreload" href="/assets/hub-NEW.js">');
  await write("assets/index-NEW.js", 'const route={path:"/wave-vault",component:Vault};');
  await write("assets/hub-NEW.js", hub());
  await write("assets/wave-vault-NEW.js", 'export default function Vault(){return "Wave Vault"}');
});
afterEach(async () => { await rm(out, { recursive: true, force: true }); });

describe("Wave Vault production artifact guard", () => {
  it("accepts minified release output with both destinations and the reachable route", async () => {
    await expect(checkWaveVaultArtifact(out)).resolves.toBeUndefined();
  });
  it("fails with build instructions when output has not been built", async () => {
    await rm(path.join(out, ".vite/manifest.json"));
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/build and check fresh output/);
  });
  it("rejects a hub missing only the quick action", async () => {
    await write("assets/hub-NEW.js", hub("{}"));
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/quick action/);
  });
  it("rejects a hub missing only the Data & Storage destination", async () => {
    await write("assets/hub-NEW.js", hub(quick, "{}"));
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/inside Data & Storage/);
  });
  it("does not accept a destination under a different category", async () => {
    await write("assets/hub-NEW.js", hub().replace("Data & Storage", "Other"));
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/inside Data & Storage/);
  });
  it.each(["quick action", "destination"])("rejects a wrong %s URL", async (kind) => {
    await write("assets/hub-NEW.js", kind === "quick action"
      ? hub(quick.replace("/wave-vault", "/elsewhere"))
      : hub(quick, destination.replace("/wave-vault", "/elsewhere")));
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(
      kind === "quick action" ? /quick action/ : /inside Data & Storage/,
    );
  });
  it("ignores good stale chunks when the current hub is missing navigation", async () => {
    await write("assets/hub-OLD.js", hub());
    await write("assets/hub-NEW.js", "const oldHub=[];");
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/quick action/);
  });
  it.each([hubKey, vaultKey])("rejects a missing manifest bundle: %s", async (key) => {
    const data = manifest();
    delete data[key as typeof hubKey];
    await writeManifest(data);
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/production bundle in manifest/);
  });
  it("rejects a missing route file even when the manifest lists it", async () => {
    await rm(path.join(out, "assets/wave-vault-NEW.js"));
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/ENOENT/);
  });
  it("rejects an empty route bundle", async () => {
    await write("assets/wave-vault-NEW.js", " ");
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/route bundle is empty/);
  });
  it("rejects an orphaned route chunk", async () => {
    const data = manifest();
    data["index.html"].dynamicImports = [hubKey];
    await writeManifest(data);
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/not reachable/);
  });
  it("rejects a missing route registration even if the chunk is still imported", async () => {
    await write("assets/index-NEW.js", 'const route={path:"/other",component:Vault};');
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/route registration/);
  });
  it("accepts route registration in an extracted static app chunk", async () => {
    const data = { ...manifest(), app: { file: "assets/app-NEW.js" } };
    Object.assign(data["index.html"], { imports: ["app"] });
    await writeManifest(data);
    await write("assets/app-NEW.js", 'const route={path:"/wave-vault",component:Vault};');
    await write("assets/index-NEW.js", 'import "./app-NEW.js";');
    await expect(checkWaveVaultArtifact(out)).resolves.toBeUndefined();
  });
  it("rejects HTML pointing to a stale entry", async () => {
    await write("index.html", '<script src="/assets/index-OLD.js"></script>');
    await expect(checkWaveVaultArtifact(out)).rejects.toThrow(/current entry bundle/);
  });
});
