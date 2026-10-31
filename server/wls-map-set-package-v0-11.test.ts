import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { MAP_SET_V0_10_PROGRAM_IDS, MAP_SET_V0_11_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { MAP_SET_V0_11_LIBRARY_RELEASE, resolveCollectionPackage } from "../shared/wls-package";
import { getCollectionProgramSource } from "../shared/wls-library";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import { createCollectionPackageLock, verifyCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";

const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const manifest = fixture("wls-map-set-package-v0-11.json");
const change = (overlay: object) => JSON.stringify({ ...JSON.parse(manifest), ...overlay });
const additions = ["map.replaceValue", "map.invertFirst", "set.fromValues"];

it("fixes the 45-program surface and rejects implicit upgrades of earlier releases", () => {
  expect(MAP_SET_V0_11_PROGRAM_IDS).toEqual([...MAP_SET_V0_10_PROGRAM_IDS, ...additions]);
  expect(MAP_SET_V0_11_PROGRAM_IDS).toHaveLength(45);
  expect(Object.isFrozen(MAP_SET_V0_11_PROGRAM_IDS)).toBe(true);
  expect(Object.isFrozen(MAP_SET_V0_11_LIBRARY_RELEASE)).toBe(true);
  expect(resolveCollectionPackage(manifest).programs).toEqual(MAP_SET_V0_11_PROGRAM_IDS);
  expect(resolveCollectionPackage(manifest).dependencies[0]).toMatchObject(MAP_SET_V0_11_LIBRARY_RELEASE);
  for (const version of ["0.3.0", "0.4.0", "0.5.0", "0.6.0", "0.7.0", "0.8.0", "0.9.0", "0.10.0"]) {
    for (const id of additions) expect(() => resolveCollectionPackage(change({
      dependencies: { "wls.collections": version }, programs: [id],
    }))).toThrow("not available");
  }
});
it("requires exact versions, the Map profile and explicit declarations", async () => {
  for (const version of ["^0.11.0", "~0.11.0", "0.11.1", "99.0.0", "latest"]) {
    expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version } }))).toThrow("version");
  }
  expect(() => resolveCollectionPackage(change({ executionProfile: "WLS-COLLECTION/1" }))).toThrow("mismatch");
  expect(() => resolveCollectionPackage(change({ programs: ["string.contains"] }))).toThrow("not available");
  const restricted = change({ programs: ["map.replaceValue"] });
  const lock = JSON.stringify(await createCollectionPackageLock(restricted));
  await expect(executeLockedCollectionPackageProgram(restricted, lock, "map.invertFirst", {})).rejects.toThrow("not declared");
});
it("locks all 45 native sources, runs the suite and fails on declaration-wide tampering", async () => {
  const lock = JSON.stringify(await createCollectionPackageLock(manifest));
  expect(JSON.parse(lock).programs).toHaveLength(45);
  expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
  expect(await runLockedCollectionTestSuite(fixture("wls-map-set-v0-11-smoke.json"), manifest, lock))
    .toMatchObject({ total: 12, passed: 12, failed: 0, integrity: "verified" });
  for (const id of MAP_SET_V0_11_PROGRAM_IDS) expect(await readCollectionProgramSource(id)).toBe(getCollectionProgramSource(id));
  const bad = JSON.parse(lock);
  bad.programs.find((p: { id: string }) => p.id === "set.fromValues").sha256 = "0".repeat(64);
  await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(bad), "map.empty", {})).rejects.toThrow("integrity mismatch");
  await expect(verifyCollectionPackageLock(manifest + "\n", lock)).rejects.toThrow("integrity mismatch");
});
it("retains the complete 0.10.0 source-lock fingerprint", async () => {
  const original = fixture("wls-map-set-package-v0-10.json");
  const lock = JSON.stringify(await createCollectionPackageLock(original));
  expect(createHash("sha256").update(lock).digest("hex")).toBe("3ee5961430d77f8e36c8c9e9c2343a513c3edb2ab4cce469d005ef4692818c64");
  expect((await verifyCollectionPackageLock(original, lock)).verified).toBe(true);
  for (const id of additions) await expect(executeLockedCollectionPackageProgram(original, lock, id, {})).rejects.toThrow("not declared");
});
