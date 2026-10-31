import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  COLLECTION_LOCK_TEXT_LIMIT, createCollectionPackageLock, executeLockedCollectionPackageProgram,
  getLockedCollectionPackageProgramSource, verifyCollectionPackageLock,
} from "../shared/wls-package-lock";
import * as library from "../shared/wls-library";
import * as vm from "../shared/wls-collection-vm";

const manifest = readFileSync("scripts/fixtures/wls-collection-package.json", "utf8");
const digest = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("offline content-locked WavelengthScript dependencies", () => {
  it("deterministically hashes exact manifest and packaged source against independent Node SHA-256", async () => {
    const lock = await createCollectionPackageLock(manifest);
    expect(await createCollectionPackageLock(manifest)).toEqual(lock);
    expect(lock.manifestSha256).toBe(digest(manifest));
    for (const program of lock.programs) expect(program.sha256).toBe(digest(library.getCollectionProgramSource(program.id)));
    expect(Object.isFrozen(lock)).toBe(true);
    expect(Object.isFrozen(lock.package)).toBe(true);
    expect(Object.isFrozen(lock.programs)).toBe(true);
    expect(lock.programs.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(lock.dependencies)).toBe(true);
  });

  it("verifies and runs a declared program without mutating caller data", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    expect(await verifyCollectionPackageLock(manifest, lock)).toMatchObject({ verified: true });
    const items = Object.freeze(["alpha", "beta"]);
    const result = await executeLockedCollectionPackageProgram(manifest, lock, "string.contains", { items, value: "beta" });
    expect(result.value).toBe(true);
    expect(items).toEqual(["alpha", "beta"]);
    await expect(getLockedCollectionPackageProgramSource(manifest, lock, "recipient.at")).rejects.toThrow("not declared");
  });

  it("rejects even whitespace-only manifest or source changes under unchanged version labels", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    await expect(verifyCollectionPackageLock(manifest + "\n", lock)).rejects.toThrow("integrity mismatch");
    const original = library.getCollectionProgramSource;
    vi.spyOn(library, "getCollectionProgramSource").mockImplementation(id => original(id) + "\n// changed\n");
    await expect(verifyCollectionPackageLock(manifest, lock)).rejects.toThrow("integrity mismatch");
  });

  it.each(["manifestSha256", "package", "dependencies", "programs"])("rejects tampered lock field %s", async field => {
    const lock = JSON.parse(JSON.stringify(await createCollectionPackageLock(manifest)));
    if (field === "manifestSha256") lock.manifestSha256 = "0".repeat(64);
    if (field === "package") lock.package.version = "9.9.9";
    if (field === "dependencies") lock.dependencies[0].version = "9.9.9";
    if (field === "programs") lock.programs[0].sha256 = "0".repeat(64);
    const execution = vi.spyOn(vm, "executeCollection");
    await expect(executeLockedCollectionPackageProgram(manifest, JSON.stringify(lock), "recipient.count", { items: [] })).rejects.toThrow();
    expect(execution).not.toHaveBeenCalled();
  });

  it("rejects missing, duplicate, reordered and unrecognized locked programs", async () => {
    const base = JSON.parse(JSON.stringify(await createCollectionPackageLock(manifest)));
    for (const programs of [
      base.programs.slice(1),
      [...base.programs, base.programs[0]],
      [...base.programs].reverse(),
      [{ id: "../file.wls", sha256: "0".repeat(64) }],
      [{ id: "__proto__", sha256: "0".repeat(64) }],
    ]) await expect(verifyCollectionPackageLock(manifest, JSON.stringify({ ...base, programs }))).rejects.toThrow();
  });

  it("allows JSON formatting/key-order differences in the lock, but no extra fields", async () => {
    const base = await createCollectionPackageLock(manifest);
    const reordered = {
      programs: base.programs.map(entry => ({ sha256: entry.sha256, id: entry.id })),
      package: { executionProfile: base.package.executionProfile, version: base.package.version, name: base.package.name },
      dependencies: base.dependencies, manifestSha256: base.manifestSha256, profile: base.profile,
    };
    expect(await verifyCollectionPackageLock(manifest, JSON.stringify(reordered, null, 4))).toMatchObject({ verified: true });
    await expect(verifyCollectionPackageLock(manifest, JSON.stringify({ ...base, fallback: true }))).rejects.toThrow();
  });

  it.each(["{", "null", "[]", "{}", " ".repeat(COLLECTION_LOCK_TEXT_LIMIT + 1)])(
    "rejects malformed or oversized lock text %s", async text => {
      await expect(verifyCollectionPackageLock(manifest, text)).rejects.toThrow();
    },
  );

  it("fails closed when SHA-256 is unavailable", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    vi.stubGlobal("crypto", undefined);
    await expect(verifyCollectionPackageLock(manifest, lock)).rejects.toThrow("SHA-256 is unavailable");
  });

  it("executes the captured verified source even if the library lookup changes during hashing", async () => {
    const lock = JSON.stringify(await createCollectionPackageLock(manifest));
    const original = library.getCollectionProgramSource;
    let changed = false;
    vi.spyOn(library, "getCollectionProgramSource").mockImplementation(id => changed
      ? 'WLS-COLLECTION/1\nCONST ["result",999]\nRETURN ["result"]'
      : original(id));
    const realDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation((algorithm, data) => {
      changed = true;
      return realDigest(algorithm, data);
    });
    const result = await executeLockedCollectionPackageProgram(manifest, lock, "recipient.count", { items: ["a", "b"] });
    expect(changed).toBe(true);
    expect(result.value).toBe(2);
  });
});
