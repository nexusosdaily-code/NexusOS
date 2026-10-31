import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCollectionPackage } from "../shared/wls-package";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram, verifyCollectionPackageLock } from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";
import { MAP_PROGRAM_IDS, MAP_V0_4_PROGRAM_IDS } from "../shared/wls-library-catalogue";

const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const text = fixture("wls-map-package-v0-4.json");
const suite = fixture("wls-map-v0-4-smoke.json");
const changed = (overlay: object) => JSON.stringify({ ...JSON.parse(text), ...overlay });

describe("explicit map composition release and locks", () => {
  it("retains the original map surface and exposes eleven programs only in the new release", () => {
    expect(MAP_PROGRAM_IDS).toHaveLength(8);
    expect(MAP_V0_4_PROGRAM_IDS).toEqual([...MAP_PROGRAM_IDS, "map.merge", "map.intersection", "map.difference"]);
    expect(Object.isFrozen(MAP_V0_4_PROGRAM_IDS)).toBe(true);
    expect(resolveCollectionPackage(text).dependencies[0].version).toBe("0.4.0");
    for (const id of ["map.merge", "map.intersection", "map.difference"]) {
      expect(() => resolveCollectionPackage(changed({ dependencies: { "wls.collections": "0.3.0" }, programs: [id] })))
        .toThrow("not available");
    }
  });

  it("requires a matching map profile, exact supported version and declared programs", async () => {
    expect(() => resolveCollectionPackage(changed({ executionProfile: "WLS-COLLECTION/1" }))).toThrow("mismatch");
    for (const version of ["^0.4.0", "99.0.0", "latest"]) {
      expect(() => resolveCollectionPackage(changed({ dependencies: { "wls.collections": version } }))).toThrow("version");
    }
    const lock = JSON.stringify(await createCollectionPackageLock(text));
    await expect(executeLockedCollectionPackageProgram(text, lock, "map.set", {})).rejects.toThrow("not declared");
    expect((await runLockedCollectionTestSuite(suite, text, lock)).passed).toBe(5);
    await expect(verifyCollectionPackageLock(`${text}\n`, lock)).rejects.toThrow("integrity mismatch");
  });

  it("verifies the original 0.3.0 source commitments without regeneration", async () => {
    const original = fixture("wls-map-package-v0-3.json");
    const lock = fixture("wls-map-v0-3-compat.lock.json");
    expect((await verifyCollectionPackageLock(original, lock)).verified).toBe(true);
    expect((await executeLockedCollectionPackageProgram(original, lock, "map.get", {
      map: { entries: [["__proto__", "data"]] }, key: "__proto__",
    })).value).toBe("data");
    await expect(executeLockedCollectionPackageProgram(original, lock, "map.merge", {})).rejects.toThrow("not declared");
  });
});
