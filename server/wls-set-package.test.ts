import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCollectionPackage } from "../shared/wls-package";
import {
  createCollectionPackageLock, verifyCollectionPackageLock, executeLockedCollectionPackageProgram,
} from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";
import { MAP_V0_4_PROGRAM_IDS, MAP_SET_V0_5_PROGRAM_IDS, SET_PROGRAM_IDS } from "../shared/wls-library-catalogue";

const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const manifest = fixture("wls-set-package-v0-5.json");
const suite = fixture("wls-set-v0-5-smoke.json");
const change = (overlay: object) => JSON.stringify({ ...JSON.parse(manifest), ...overlay });

describe("exact map-backed Set dependency release", () => {
  it("exposes the fixed prior map surface and ten Set programs in 0.5.0", () => {
    expect(SET_PROGRAM_IDS).toHaveLength(10);
    expect(MAP_SET_V0_5_PROGRAM_IDS).toEqual([...MAP_V0_4_PROGRAM_IDS, ...SET_PROGRAM_IDS]);
    expect(resolveCollectionPackage(manifest).programs).toEqual(MAP_SET_V0_5_PROGRAM_IDS);
    expect(resolveCollectionPackage(manifest).dependencies[0].version).toBe("0.5.0");
    expect(Object.isFrozen(SET_PROGRAM_IDS)).toBe(true);
    for (const version of ["0.3.0", "0.4.0"]) for (const id of SET_PROGRAM_IDS) {
      expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version }, programs: [id] })))
        .toThrow("not available");
    }
  });

  it("requires the Map profile and exact version, not a fabricated Set interpreter", () => {
    for (const profile of ["WLS-SET/1", "WLS-COLLECTION/1"]) {
      expect(() => resolveCollectionPackage(change({ executionProfile: profile }))).toThrow();
    }
    for (const version of ["^0.5.0", "99.0.0", "latest"]) {
      expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version } }))).toThrow("version");
    }
    expect(() => resolveCollectionPackage(change({ programs: ["string.contains"] }))).toThrow("not available");
  });

  it("locks all 21 programs and executes every Set operation from verified snapshots", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    expect(JSON.parse(lock).programs).toHaveLength(21);
    expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
    expect(await runLockedCollectionTestSuite(suite, manifest, lock))
      .toMatchObject({ total: 13, passed: 13, failed: 0, integrity: "verified" });
    const changed = JSON.parse(lock);
    changed.programs.find((p: { id: string }) => p.id === "set.union").sha256 = "0".repeat(64);
    await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(changed), "set.empty", {}))
      .rejects.toThrow("integrity mismatch");
    await expect(verifyCollectionPackageLock(`${manifest}\n`, lock)).rejects.toThrow("integrity mismatch");
  });

  it("rejects undeclared programs even within the same release", async () => {
    const restricted = change({ programs: ["set.empty"] });
    const lock = JSON.stringify(await createCollectionPackageLock(restricted));
    await expect(executeLockedCollectionPackageProgram(restricted, lock, "set.has", {})).rejects.toThrow("not declared");
  });

  it.each(["0-3", "0-4"])("keeps the pre-Set %s source commitments valid without relocking", async version => {
    const original = fixture(`wls-map-package-v${version}.json`);
    const lock = fixture(`wls-map-v${version}-compat.lock.json`);
    expect((await verifyCollectionPackageLock(original, lock)).verified).toBe(true);
    await expect(executeLockedCollectionPackageProgram(original, lock, "set.empty", {})).rejects.toThrow("not declared");
  });
});
