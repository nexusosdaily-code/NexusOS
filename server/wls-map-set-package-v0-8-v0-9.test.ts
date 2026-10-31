import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCollectionPackage } from "../shared/wls-package";
import { MAP_SET_V0_7_PROGRAM_IDS, MAP_SET_V0_8_PROGRAM_IDS, MAP_SET_V0_9_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { createCollectionPackageLock, verifyCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import { getCollectionProgramSource } from "../shared/wls-library";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";

const fixture = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
const releases = [
  { version: "0.8.0", suffix: "0-8", ids: MAP_SET_V0_8_PROGRAM_IDS, prior: MAP_SET_V0_7_PROGRAM_IDS,
    added: ["map.getOrDefault", "map.setIfAbsent", "map.replaceIfPresent"], total: 35 },
  { version: "0.9.0", suffix: "0-9", ids: MAP_SET_V0_9_PROGRAM_IDS, prior: MAP_SET_V0_8_PROGRAM_IDS,
    added: ["map.take", "map.drop", "set.take", "set.drop"], total: 39 },
] as const;
describe.each(releases)("exact $version dependency package", release => {
  const manifest = fixture(`wls-map-set-package-v${release.suffix}.json`);
  const suite = fixture(`wls-map-set-v${release.suffix}-smoke.json`);
  const change = (overlay: object) => JSON.stringify({ ...JSON.parse(manifest), ...overlay });

  it("has an explicit frozen additive surface and matching execution profile", () => {
    expect(release.ids).toEqual([...release.prior, ...release.added]);
    expect(Object.isFrozen(release.ids)).toBe(true);
    const resolved = resolveCollectionPackage(manifest);
    expect(resolved.programs).toEqual(release.ids);
    expect(resolved.dependencies[0]).toMatchObject({ version: release.version, executionProfile: "WLS-MAP/1" });
    expect(resolved.programs).toHaveLength(release.total);
  });

  it("does not grant additions to earlier exact releases", () => {
    const older = ["0.3.0", "0.4.0", "0.5.0", "0.6.0", "0.7.0"];
    if (release.version === "0.9.0") older.push("0.8.0");
    for (const version of older) for (const id of release.added) {
      expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version }, programs: [id] })))
        .toThrow("not available");
    }
  });

  it("requires exact versions, matching profiles and declared programs", async () => {
    for (const version of [`^${release.version}`, "~" + release.version, "99.0.0", "0.9.1", "latest"]) {
      expect(() => resolveCollectionPackage(change({ dependencies: { "wls.collections": version } }))).toThrow("version");
    }
    expect(() => resolveCollectionPackage(change({ executionProfile: "WLS-COLLECTION/1" }))).toThrow("mismatch");
    expect(() => resolveCollectionPackage(change({ programs: ["string.contains"] }))).toThrow("not available");
    const restricted = change({ programs: [release.added[0]] });
    const lock = JSON.stringify(await createCollectionPackageLock(restricted));
    await expect(executeLockedCollectionPackageProgram(restricted, lock, release.added[1], {}))
      .rejects.toThrow("not declared");
  });

  it("verifies every source commitment and the full twelve-case native smoke suite", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    expect(JSON.parse(lock).programs).toHaveLength(release.total);
    expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
    expect(await runLockedCollectionTestSuite(suite, manifest, lock))
      .toMatchObject({ total: 12, passed: 12, failed: 0, integrity: "verified" });
    for (const id of release.ids) expect(await readCollectionProgramSource(id)).toBe(getCollectionProgramSource(id));
    const tampered = JSON.parse(lock);
    tampered.programs.find((entry: { id: string }) => entry.id === release.added[0]).sha256 = "0".repeat(64);
    // Integrity checks cover the whole declaration, not just the requested source.
    await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(tampered), "map.empty", {}))
      .rejects.toThrow("integrity mismatch");
    await expect(verifyCollectionPackageLock(manifest + "\n", lock)).rejects.toThrow("integrity mismatch");
  });

  it("rejects changed dependency identity rather than silently relocking", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    const dependency = release.version === "0.8.0" ? "0.9.0" : "0.8.0";
    const changed = change({ dependencies: { "wls.collections": dependency }, programs: ["map.empty"] });
    await expect(verifyCollectionPackageLock(changed, lock)).rejects.toThrow("integrity mismatch");
  });
});

it.each([
  { suffix: "0-7", sha: "bb361ff41262cf27539e140dd8bcb6c290bd1b03e21f8eec8a6b3fc1bcc5f928", unavailable: "map.getOrDefault" },
  { suffix: "0-8", sha: "57949f68be709c363a3657e6cbac72339b34d01b574d045a8201d4ef69c7508b", unavailable: "map.take" },
])("preserves the complete retained $suffix lock fingerprint", async ({ suffix, sha, unavailable }) => {
  const manifest = fixture(`wls-map-set-package-v${suffix}.json`);
  const lock = JSON.stringify(await createCollectionPackageLock(manifest));
  expect(createHash("sha256").update(lock).digest("hex")).toBe(sha);
  expect((await verifyCollectionPackageLock(manifest, lock)).verified).toBe(true);
  await expect(executeLockedCollectionPackageProgram(manifest, lock, unavailable, {})).rejects.toThrow("not declared");
});
