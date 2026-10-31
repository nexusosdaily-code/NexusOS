import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAP_PROFILE, executeMap } from "../shared/wls-map-vm";
import { COLLECTION_V0_1_PROGRAM_IDS, COLLECTION_V0_2_PROGRAM_IDS, MAP_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { getCollectionProgramSource } from "../shared/wls-library";
import * as library from "../shared/wls-library";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import { MAP_LIBRARY_RELEASE, executeCollectionPackageProgram, resolveCollectionPackage } from "../shared/wls-package";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram, verifyCollectionPackageLock } from "../shared/wls-package-lock";
import { runCollectionTestSuite, runLockedCollectionTestSuite } from "../shared/wls-test-runner";

const file = (name: string) => readFileSync(`scripts/fixtures/${name}`, "utf8");
const manifest = file("wls-map-package-v0-3.json");
const suite = file("wls-map-v0-3-smoke.json");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
afterEach(() => vi.restoreAllMocks());

describe("fixed map release and source integrity", () => {
  it("keeps an explicit map-only exact-version surface, separate from both string-list releases", async () => {
    const result = resolveCollectionPackage(manifest);
    expect(result.executionProfile).toBe(MAP_PROFILE);
    expect(result.dependencies).toEqual([MAP_LIBRARY_RELEASE]);
    expect(result.programs).toEqual([
      "map.empty", "map.copy", "map.size", "map.has", "map.get", "map.set", "map.delete", "map.keyAt",
    ]);
    expect(COLLECTION_V0_1_PROGRAM_IDS).toHaveLength(7);
    expect(COLLECTION_V0_2_PROGRAM_IDS).toHaveLength(9);
    for (const id of MAP_PROGRAM_IDS) {
      expect(await readCollectionProgramSource(id)).toBe(getCollectionProgramSource(id));
      const program = getCollectionProgramSource(id);
      expect(program.startsWith(MAP_PROFILE + "\n")).toBe(true);
    }
    expect(executeCollectionPackageProgram(manifest, "map.get", { map: { entries: [["a", "v"]] }, key: "a" }).value).toBe("v");
  });

  it.each(["0.1.0", "0.2.0"])("does not grant map programs to a retained %s manifest", version => {
    const old = JSON.stringify({
      ...JSON.parse(manifest), executionProfile: "WLS-COLLECTION/1",
      dependencies: { "wls.collections": version },
      programs: ["map.empty"],
    });
    expect(() => resolveCollectionPackage(old)).toThrow("not available");
  });

  it.each(["^0.3.0", "0.3", "99.0.0", "latest", "*"])("rejects unsupported map version %s", version => {
    expect(() => resolveCollectionPackage(JSON.stringify({
      ...JSON.parse(manifest), dependencies: { "wls.collections": version },
    }))).toThrow("version");
  });

  it("rejects profile mismatch and cross-profile program IDs instead of silently translating", () => {
    expect(() => resolveCollectionPackage(JSON.stringify({
      ...JSON.parse(manifest), executionProfile: "WLS-COLLECTION/1",
    }))).toThrow("profile mismatch");
    expect(() => resolveCollectionPackage(JSON.stringify({
      ...JSON.parse(manifest), programs: ["string.contains"],
    }))).toThrow("not available");
    expect(() => executeMap(getCollectionProgramSource("string.contains"), {})).toThrow("version");
  });

  it("locks exact source bytes, verifies with independent SHA-256 and runs all map suite cases", async () => {
    const locked = await createCollectionPackageLock(manifest);
    expect(locked.manifestSha256).toBe(hash(manifest));
    for (const entry of locked.programs) expect(entry.sha256).toBe(hash(getCollectionProgramSource(entry.id)));
    const lock = JSON.stringify(locked);
    expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
    expect(runCollectionTestSuite(suite)).toMatchObject({ total: 12, passed: 12, failed: 0 });
    expect(await runLockedCollectionTestSuite(suite, manifest, lock)).toMatchObject({
      total: 12, passed: 12, failed: 0, integrity: "verified",
    });
    await expect(verifyCollectionPackageLock(manifest + "\n", lock)).rejects.toThrow("integrity mismatch");
    const original = library.getCollectionProgramSource;
    vi.spyOn(library, "getCollectionProgramSource").mockImplementation(id => original(id) + "\n");
    await expect(verifyCollectionPackageLock(manifest, lock)).rejects.toThrow("integrity mismatch");
  });

  it("executes the map snapshot hashed before an asynchronous source replacement", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    const original = library.getCollectionProgramSource;
    let changed = false;
    vi.spyOn(library, "getCollectionProgramSource").mockImplementation(id => changed
      ? 'WLS-MAP/1\nCONST ["r","wrong"]\nRETURN ["r"]' : original(id));
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, "digest").mockImplementation((algorithm, data) => {
      changed = true;
      return digest(algorithm, data);
    });
    expect((await executeLockedCollectionPackageProgram(
      manifest, lock, "map.get", { map: { entries: [["a", "right"]] }, key: "a" },
    )).value).toBe("right");
    expect(changed).toBe(true);
  });

  it.each([
    ["wls-collection-package.json", "wls-collection-package-v0-1.lock.json", "string.contains", { items: ["a"], value: "a" }, true],
    ["wls-collection-package-v0-2.json", "wls-collection-package-v0-2.lock.json", "string.reverse", { items: ["a", "b"] }, ["b", "a"]],
  ] as const)("verifies unchanged pre-map locks for %s without creating replacements", async (name, lockName, id, inputs, value) => {
    // These fixtures were captured from the pre-map source tree using Node
    // crypto, not created at test time by the lock implementation under test.
    const text = file(name), lock = file(lockName);
    expect((await verifyCollectionPackageLock(text, lock)).verified).toBe(true);
    expect((await executeLockedCollectionPackageProgram(text, lock, id, inputs)).value).toEqual(value);
    expect(file(lockName)).toBe(lock);
  });

  it("validates malformed map expectations before executing any suite case", () => {
    const text = JSON.stringify({ profile: "WLS-TEST/1", cases: [
      { name: "first", program: "map.empty", inputs: {}, expect: { value: { entries: [] } } },
      { name: "bad", program: "map.copy", inputs: {}, expect: { value: { entries: [["a", "x"], ["a", "y"]] } } },
    ] });
    const loader = vi.spyOn(library, "getCollectionProgramSource");
    expect(() => runCollectionTestSuite(text)).toThrow("valid expected value");
    expect(loader).not.toHaveBeenCalled();
  });
});
