import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { MAP_SET_V0_14_PROGRAM_IDS, MAP_SET_V0_15_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { MAP_SET_V0_15_LIBRARY_RELEASE, resolveCollectionPackage } from "../shared/wls-package";
import { getCollectionProgramSource } from "../shared/wls-library";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import { createCollectionPackageLock, verifyCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";

const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const manifest = fixture("wls-map-set-package-v0-15.json");
const additions = ["map.slice", "set.slice"];

it("fixes the 56-program surface while retaining old package boundaries", () => {
  expect(MAP_SET_V0_15_LIBRARY_RELEASE).toMatchObject({ version: "0.15.0", executionProfile: "WLS-MAP/1" });
  expect(MAP_SET_V0_15_PROGRAM_IDS).toEqual([...MAP_SET_V0_14_PROGRAM_IDS, ...additions]);
  expect(Object.isFrozen(MAP_SET_V0_15_PROGRAM_IDS)).toBe(true);
  expect(resolveCollectionPackage(manifest).programs).toEqual(MAP_SET_V0_15_PROGRAM_IDS);
  const prior = JSON.parse(fixture("wls-map-set-package-v0-14.json"));
  for (const id of additions) {
    expect(() => resolveCollectionPackage(JSON.stringify({ ...prior, programs: [id] }))).toThrow("not available");
  }
  for (const version of ["^0.15.0", "~0.15.0", "0.15.1", "99.0.0", "latest"]) {
    expect(() => resolveCollectionPackage(JSON.stringify({ ...JSON.parse(manifest), dependencies: { "wls.collections": version } }))).toThrow();
  }
  expect(() => resolveCollectionPackage(JSON.stringify({ ...JSON.parse(manifest), executionProfile: "WLS-COLLECTION/1" }))).toThrow();
});

it("locks all 56 sources, executes 12 cases and rejects tampering or undeclared execution", async () => {
  const lock = JSON.stringify(await createCollectionPackageLock(manifest));
  expect(JSON.parse(lock).programs).toHaveLength(56);
  expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
  expect(await runLockedCollectionTestSuite(fixture("wls-map-set-v0-15-smoke.json"), manifest, lock))
    .toMatchObject({ total: 12, passed: 12, failed: 0, integrity: "verified" });
  for (const id of MAP_SET_V0_15_PROGRAM_IDS) expect(await readCollectionProgramSource(id)).toBe(getCollectionProgramSource(id));
  const bad = JSON.parse(lock);
  bad.programs.find((p: { id: string }) => p.id === additions[0]).sha256 = "0".repeat(64);
  await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(bad), "map.empty", {})).rejects.toThrow("integrity mismatch");
  await expect(verifyCollectionPackageLock(manifest + "\n", lock)).rejects.toThrow("integrity mismatch");
  const subset = JSON.stringify({ ...JSON.parse(manifest), programs: ["map.empty"] });
  const subsetLock = JSON.stringify(await createCollectionPackageLock(subset));
  for (const id of additions) {
    await expect(executeLockedCollectionPackageProgram(subset, subsetLock, id, {})).rejects.toThrow("not declared");
  }
});

it("preserves the entire 0.14.0 source-lock fingerprint and its declaration boundary", async () => {
  const old = fixture("wls-map-set-package-v0-14.json");
  const lock = JSON.stringify(await createCollectionPackageLock(old));
  expect(createHash("sha256").update(lock).digest("hex")).toBe("1e8dbda57f2408cd30ebf6ae1ca6a99221b429a9f8c1713925cd1c975f3f181f");
  for (const id of additions) {
    await expect(executeLockedCollectionPackageProgram(old, lock, id, {})).rejects.toThrow("not declared");
  }
});
