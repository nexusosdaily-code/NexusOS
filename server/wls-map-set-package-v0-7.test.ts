import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCollectionPackage } from "../shared/wls-package";
import { MAP_SET_V0_6_PROGRAM_IDS, MAP_SET_V0_7_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { createCollectionPackageLock, verifyCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";

const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const manifest = fixture("wls-map-set-package-v0-7.json");
const suite = fixture("wls-map-set-v0-7-smoke.json");
const additions = ["map.equals", "map.isSubmap", "map.intersectionEntries", "map.differenceEntries", "set.symmetricDifference"];
const change = (overlay: object) => JSON.stringify({ ...JSON.parse(manifest), ...overlay });

describe("exact 0.7.0 dependency contract", () => {
  it("adds exactly five programs without expanding older surfaces", () => {
    expect(MAP_SET_V0_7_PROGRAM_IDS).toEqual([...MAP_SET_V0_6_PROGRAM_IDS, ...additions]);
    expect(Object.isFrozen(MAP_SET_V0_7_PROGRAM_IDS)).toBe(true);
    expect(resolveCollectionPackage(manifest).programs).toEqual(MAP_SET_V0_7_PROGRAM_IDS);
    expect(resolveCollectionPackage(manifest).dependencies[0].version).toBe("0.7.0");
    for (const version of ["0.3.0", "0.4.0", "0.5.0", "0.6.0"]) for (const id of additions) {
      expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version }, programs: [id] })))
        .toThrow("not available");
    }
  });

  it("requires exact versions, matching profiles and explicit program declarations", async () => {
    for (const version of ["^0.7.0", "0.7.1", "99.0.0", "latest"]) {
      expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version } }))).toThrow("version");
    }
    expect(() => resolveCollectionPackage(change({ executionProfile: "WLS-COLLECTION/1" }))).toThrow("mismatch");
    expect(() => resolveCollectionPackage(change({ programs: ["string.contains"] }))).toThrow("not available");
    const restricted = change({ programs: ["map.equals"] });
    const lock = JSON.stringify(await createCollectionPackageLock(restricted));
    await expect(executeLockedCollectionPackageProgram(restricted, lock, "map.isSubmap", {})).rejects.toThrow("not declared");
  });

  it("locks all 32 sources and verifies the complete twelve-case native suite", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    expect(JSON.parse(lock).programs).toHaveLength(32);
    expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
    expect(await runLockedCollectionTestSuite(suite, manifest, lock))
      .toMatchObject({ total: 12, passed: 12, failed: 0, integrity: "verified" });
    const tampered = JSON.parse(lock);
    tampered.programs.find((p: { id: string }) => p.id === "map.equals").sha256 = "0".repeat(64);
    await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(tampered), "set.symmetricDifference", {}))
      .rejects.toThrow("integrity mismatch");
    await expect(verifyCollectionPackageLock(`${manifest}\n`, lock)).rejects.toThrow("integrity mismatch");
  });

  it("preserves the pre-0.7.0 fingerprint of the entire 0.6.0 example lock", async () => {
    const original = fixture("wls-map-set-package-v0-6.json");
    const lock = await createCollectionPackageLock(original);
    // Captured from the retained CLI before adding the 0.7.0 sources.
    expect(createHash("sha256").update(JSON.stringify(lock)).digest("hex"))
      .toBe("6e7f2cf308bd53d10a03610cebd4d975275922de72d06a8531df11752b29f189");
    expect((await verifyCollectionPackageLock(original, JSON.stringify(lock))).verified).toBe(true);
    await expect(executeLockedCollectionPackageProgram(original, JSON.stringify(lock), "map.equals", {})).rejects.toThrow("not declared");
  });
});
