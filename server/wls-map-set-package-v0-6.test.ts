import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCollectionPackage } from "../shared/wls-package";
import {
  createCollectionPackageLock, executeLockedCollectionPackageProgram, verifyCollectionPackageLock,
} from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";
import { MAP_SET_V0_5_PROGRAM_IDS, MAP_SET_V0_6_PROGRAM_IDS } from "../shared/wls-library-catalogue";

const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const manifest = fixture("wls-map-set-package-v0-6.json");
const suite = fixture("wls-map-set-v0-6-smoke.json");
const newIds = ["map.filterByValue", "map.rejectByValue", "map.invertLast", "set.isSubset", "set.isDisjoint", "set.equals"];
const change = (overlay: object) => JSON.stringify({ ...JSON.parse(manifest), ...overlay });

describe("exact 0.6.0 Map and Set release", () => {
  it("retains the 0.5.0 surface and explicitly adds only six programs", () => {
    expect(MAP_SET_V0_6_PROGRAM_IDS).toEqual([...MAP_SET_V0_5_PROGRAM_IDS, ...newIds]);
    expect(Object.isFrozen(MAP_SET_V0_6_PROGRAM_IDS)).toBe(true);
    expect(resolveCollectionPackage(manifest).programs).toEqual(MAP_SET_V0_6_PROGRAM_IDS);
    expect(resolveCollectionPackage(manifest).dependencies[0].version).toBe("0.6.0");
    for (const version of ["0.3.0", "0.4.0", "0.5.0"]) for (const id of newIds) {
      expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version }, programs: [id] })))
        .toThrow("not available");
    }
  });

  it("requires an exact local version, matching profile and declared program", async () => {
    for (const version of ["^0.6.0", "99.0.0", "latest"]) {
      expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version } }))).toThrow("version");
    }
    expect(() => resolveCollectionPackage(change({ executionProfile: "WLS-COLLECTION/1" }))).toThrow("mismatch");
    expect(() => resolveCollectionPackage(change({ programs: ["string.contains"] }))).toThrow("not available");
    const restricted = change({ programs: ["set.equals"] });
    const lock = JSON.stringify(await createCollectionPackageLock(restricted));
    await expect(executeLockedCollectionPackageProgram(restricted, lock, "set.isSubset", {})).rejects.toThrow("not declared");
  });

  it("checks all declared sources before executing the ten-case locked suite", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    expect(JSON.parse(lock).programs).toHaveLength(27);
    expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
    expect(await runLockedCollectionTestSuite(suite, manifest, lock))
      .toMatchObject({ total: 10, passed: 10, failed: 0, integrity: "verified" });
    const tampered = JSON.parse(lock);
    tampered.programs.find((p: { id: string }) => p.id === "set.equals").sha256 = "0".repeat(64);
    await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(tampered), "map.filterByValue", {}))
      .rejects.toThrow("integrity mismatch");
    await expect(verifyCollectionPackageLock(`${manifest}\n`, lock)).rejects.toThrow("integrity mismatch");
  });

  it("preserves the exact pre-0.6.0 lock fingerprint of all 21 old programs", async () => {
    const original = fixture("wls-set-package-v0-5.json");
    const lock = await createCollectionPackageLock(original);
    // Captured from the existing 0.5.0 CLI before adding this release.
    const fingerprint = createHash("sha256").update(JSON.stringify(lock)).digest("hex");
    expect(fingerprint).toBe("5ffd6d6125ea6e20d8e39c05210f831e99c46a2144cc1f61e1fdb7f9f5b5d550");
    expect((await verifyCollectionPackageLock(original, JSON.stringify(lock))).verified).toBe(true);
    await expect(executeLockedCollectionPackageProgram(original, JSON.stringify(lock), "set.equals", {}))
      .rejects.toThrow("not declared");
  });
});
