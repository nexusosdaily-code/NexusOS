import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { resolveCollectionPackage } from "../shared/wls-package";
import { MAP_SET_V0_9_PROGRAM_IDS, MAP_SET_V0_10_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { getCollectionProgramSource } from "../shared/wls-library";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import { createCollectionPackageLock, verifyCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";
const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const manifest = fixture("wls-map-set-package-v0-10.json");
const change = (overlay: object) => JSON.stringify({ ...JSON.parse(manifest), ...overlay });
const additions = ["map.hasValue", "map.countValue", "map.findKeyByValueOrDefault"];

it("fixes the 42-program release and keeps earlier surfaces unchanged", () => {
  expect(MAP_SET_V0_10_PROGRAM_IDS).toEqual([...MAP_SET_V0_9_PROGRAM_IDS, ...additions]);
  expect(Object.isFrozen(MAP_SET_V0_10_PROGRAM_IDS)).toBe(true);
  expect(resolveCollectionPackage(manifest).programs).toEqual(MAP_SET_V0_10_PROGRAM_IDS);
  expect(resolveCollectionPackage(manifest).dependencies[0]).toMatchObject({ version: "0.10.0", executionProfile: "WLS-MAP/1" });
  for (const version of ["0.3.0", "0.4.0", "0.5.0", "0.6.0", "0.7.0", "0.8.0", "0.9.0"]) for (const id of additions) {
    expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version }, programs: [id] })))
      .toThrow("not available");
  }
});
it("requires exact versions, matching profiles and declared IDs", async () => {
  for (const version of ["^0.10.0", "0.10.1", "99.0.0", "latest"]) {
    expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version } }))).toThrow("version");
  }
  expect(() => resolveCollectionPackage(change({ executionProfile: "WLS-COLLECTION/1" }))).toThrow("mismatch");
  expect(() => resolveCollectionPackage(change({ programs: ["string.contains"] }))).toThrow("not available");
  const restricted = change({ programs: ["map.hasValue"] });
  const lock = JSON.stringify(await createCollectionPackageLock(restricted));
  await expect(executeLockedCollectionPackageProgram(restricted, lock, "map.countValue", {})).rejects.toThrow("not declared");
});
it("locks every source, runs the native suite and rejects tampering anywhere in the declaration", async () => {
  const lock = JSON.stringify(await createCollectionPackageLock(manifest));
  expect(JSON.parse(lock).programs).toHaveLength(42);
  expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
  expect(await runLockedCollectionTestSuite(fixture("wls-map-set-v0-10-smoke.json"), manifest, lock))
    .toMatchObject({ total: 12, passed: 12, failed: 0, integrity: "verified" });
  for (const id of MAP_SET_V0_10_PROGRAM_IDS) expect(await readCollectionProgramSource(id)).toBe(getCollectionProgramSource(id));
  const bad = JSON.parse(lock);
  bad.programs.find((p: { id: string }) => p.id === "map.countValue").sha256 = "0".repeat(64);
  await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(bad), "map.empty", {})).rejects.toThrow("integrity mismatch");
  await expect(verifyCollectionPackageLock(manifest + "\n", lock)).rejects.toThrow("integrity mismatch");
});
it("preserves the complete pre-0.10.0 lock fingerprint of all 39 prior sources", async () => {
  const original = fixture("wls-map-set-package-v0-9.json");
  const lock = JSON.stringify(await createCollectionPackageLock(original));
  expect(createHash("sha256").update(lock).digest("hex")).toBe("4b1aff7c26108409807e3b275d59045354b6392362abbf59a1d39b05929a0c50");
  expect((await verifyCollectionPackageLock(original, lock)).verified).toBe(true);
  await expect(executeLockedCollectionPackageProgram(original, lock, "map.hasValue", {})).rejects.toThrow("not declared");
});
