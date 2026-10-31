import { CollectionVMError } from "./wls-collection-vm";
import { compileLibraryProgram, executeLibraryProgram } from "./wls-execution";
import { LIBRARY_PROGRAM_IDS, requireLibraryProgramId } from "./wls-library-catalogue";
import { getCollectionProgramSource } from "./wls-library";
import { resolveCollectionPackage } from "./wls-package";

export const COLLECTION_LOCK_PROFILE = "WLS-LOCK/1";
export const COLLECTION_LOCK_TEXT_LIMIT = 16_384;
const fail = (message: string): never => { throw new CollectionVMError(message); };
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
const isHash = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

function identity(value: unknown) {
  if (!record(value) || !exactKeys(value, ["name", "version", "executionProfile"]) ||
    typeof value.name !== "string" || typeof value.version !== "string" ||
    typeof value.executionProfile !== "string") return fail("Malformed lock package identity.");
  return Object.freeze({ name: value.name, version: value.version, executionProfile: value.executionProfile });
}

function parseLock(text: string) {
  if (typeof text !== "string" || text.length > COLLECTION_LOCK_TEXT_LIMIT) fail("Lock exceeds its text limit.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { fail("Lock must contain valid JSON."); }
  if (!record(value) || !exactKeys(value, ["profile", "manifestSha256", "package", "dependencies", "programs"]) ||
    value.profile !== COLLECTION_LOCK_PROFILE || !isHash(value.manifestSha256) ||
    !Array.isArray(value.dependencies) || value.dependencies.length !== 1 ||
    !Array.isArray(value.programs) || !value.programs.length || value.programs.length > LIBRARY_PROGRAM_IDS.length) {
    return fail("Unsupported or malformed package lock.");
  }
  const seen = new Set<string>();
  const programs = value.programs.map((entry: unknown) => {
    if (!record(entry) || !exactKeys(entry, ["id", "sha256"]) || !isHash(entry.sha256)) {
      return fail("Malformed locked program.");
    }
    const id = requireLibraryProgramId(entry.id);
    if (seen.has(id)) fail("Duplicate locked program.");
    seen.add(id);
    return Object.freeze({ id, sha256: entry.sha256 });
  });
  return Object.freeze({
    profile: COLLECTION_LOCK_PROFILE, manifestSha256: value.manifestSha256,
    package: identity(value.package),
    dependencies: Object.freeze(value.dependencies.map(identity)),
    programs: Object.freeze(programs),
  });
}

function snapshot(text: string) {
  const manifest = resolveCollectionPackage(text);
  // Capture ALL source strings synchronously, before any hashing await.
  const programs = Object.freeze(manifest.programs.map(id => {
    const source = getCollectionProgramSource(id);
    compileLibraryProgram(source);
    return Object.freeze({ id, source });
  }));
  return Object.freeze({ manifest, programs });
}
type Snapshot = ReturnType<typeof snapshot>;

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) !== text) {
    fail("Cannot lock malformed Unicode source.");
  }
  if (!globalThis.crypto?.subtle) fail("SHA-256 is unavailable; package integrity cannot be checked.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function lockSnapshot(text: string, captured: Snapshot) {
  const { manifest, programs } = captured;
  const hashes = await Promise.all(programs.map(async ({ id, source }) =>
    Object.freeze({ id, sha256: await sha256(source) })));
  return Object.freeze({
    profile: COLLECTION_LOCK_PROFILE, manifestSha256: await sha256(text),
    package: Object.freeze({ name: manifest.name, version: manifest.version, executionProfile: manifest.executionProfile }),
    dependencies: manifest.dependencies, programs: Object.freeze(hashes),
  });
}

/** Explicit lock creation only; never called as a verification fallback. */
export async function createCollectionPackageLock(text: string) {
  const captured = snapshot(text);
  return lockSnapshot(text, captured);
}

async function verifySnapshot(text: string, lockText: string) {
  const locked = parseLock(lockText);
  const captured = snapshot(text);
  const expected = await lockSnapshot(text, captured);
  // Both objects have strictly validated schemas and canonical property order.
  if (JSON.stringify(locked) !== JSON.stringify(expected)) {
    fail("Package integrity mismatch; review changes before creating a new lock.");
  }
  return { captured, locked };
}

export async function verifyCollectionPackageLock(text: string, lockText: string) {
  const { locked } = await verifySnapshot(text, lockText);
  return Object.freeze({
    profile: COLLECTION_LOCK_PROFILE, verified: true,
    package: locked.package, dependencies: locked.dependencies,
    programs: Object.freeze(locked.programs.map(program => program.id)),
  });
}

/** Capture and verify the entire package once; consumers must not reload sources. */
export async function getLockedCollectionPackageSources(text: string, lockText: string) {
  const { captured } = await verifySnapshot(text, lockText);
  return captured.programs;
}

/** Return the exact verified snapshot, never look source up again after hashing. */
export async function getLockedCollectionPackageProgramSource(text: string, lockText: string, program: string) {
  const id = requireLibraryProgramId(program);
  const programs = await getLockedCollectionPackageSources(text, lockText);
  const selected = programs.find(entry => entry.id === id);
  if (!selected) return fail("Program is not declared by this locked package.");
  return selected.source;
}

export async function executeLockedCollectionPackageProgram(
  text: string, lockText: string, program: string, inputs: Readonly<Record<string, unknown>>,
) {
  const source = await getLockedCollectionPackageProgramSource(text, lockText, program);
  return executeLibraryProgram(source, inputs);
}
