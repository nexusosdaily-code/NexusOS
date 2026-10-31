import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { MAP_SET_V0_11_PROGRAM_IDS, MAP_SET_V0_12_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { MAP_SET_V0_12_LIBRARY_RELEASE, resolveCollectionPackage } from "../shared/wls-package";
import { createCollectionPackageLock, verifyCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";

const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const manifest = fixture("wls-map-set-package-v0-12.json");
const additions = ["map.findLastKeyByValueOrDefault", "map.replaceFirstValue", "map.replaceLastValue"];

it("fixes the 48-program surface without granting it to previous consumers", () => {
  expect(MAP_SET_V0_12_LIBRARY_RELEASE).toMatchObject({ version: "0.12.0", executionProfile: "WLS-MAP/1" });
  expect(MAP_SET_V0_12_PROGRAM_IDS).toEqual([...MAP_SET_V0_11_PROGRAM_IDS, ...additions]);
  expect(Object.isFrozen(MAP_SET_V0_12_PROGRAM_IDS)).toBe(true);
  expect(resolveCollectionPackage(manifest).programs).toEqual(MAP_SET_V0_12_PROGRAM_IDS);
  const prior = JSON.parse(fixture("wls-map-set-package-v0-11.json"));
  for (const id of additions) {
    expect(() => resolveCollectionPackage(JSON.stringify({ ...prior, programs: [id] }))).toThrow();
  }
  expect(() => resolveCollectionPackage(JSON.stringify({ ...JSON.parse(manifest), executionProfile: "WLS-COLLECTION/1" }))).toThrow();
  for (const version of ["^0.12.0", "0.12.1", "latest"]) {
    expect(() => resolveCollectionPackage(JSON.stringify({ ...JSON.parse(manifest), dependencies: { "wls.collections": version } }))).toThrow();
  }
});

it("locks all 48 sources, executes 12 cases and rejects source/manifest tampering", async () => {
  const lock = JSON.stringify(await createCollectionPackageLock(manifest));
  expect(JSON.parse(lock).programs).toHaveLength(48);
  expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
  expect(await runLockedCollectionTestSuite(fixture("wls-map-set-v0-12-smoke.json"), manifest, lock))
    .toMatchObject({ total: 12, passed: 12, failed: 0, integrity: "verified" });
  const bad = JSON.parse(lock);
  bad.programs.find((p: { id: string }) => p.id === additions[0]).sha256 = "0".repeat(64);
  await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(bad), "map.empty", {})).rejects.toThrow("integrity mismatch");
  await expect(verifyCollectionPackageLock(manifest + "\n", lock)).rejects.toThrow("integrity mismatch");
});

it("preserves the complete retained 0.11.0 source-lock fingerprint", async () => {
  const old = fixture("wls-map-set-package-v0-11.json");
  const lock = JSON.stringify(await createCollectionPackageLock(old));
  expect(createHash("sha256").update(lock).digest("hex")).toBe("f3b71a4eae855be2d2d9058b3c59927202cec17f91f95ff98405490d40fb7ca9");
  for (const id of additions) {
    await expect(executeLockedCollectionPackageProgram(old, lock, id, {})).rejects.toThrow("not declared");
  }
});
