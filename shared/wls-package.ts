import { COLLECTION_PROFILE, CollectionVMError } from "./wls-collection-vm";
import { MAP_PROFILE } from "./wls-map-vm";
import { compileLibraryProgram, executeLibraryProgram, executionProfile } from "./wls-execution";
import { COLLECTION_V0_1_PROGRAM_IDS, COLLECTION_V0_2_PROGRAM_IDS, MAP_PROGRAM_IDS, MAP_V0_4_PROGRAM_IDS, MAP_SET_V0_5_PROGRAM_IDS, MAP_SET_V0_6_PROGRAM_IDS, MAP_SET_V0_7_PROGRAM_IDS, MAP_SET_V0_8_PROGRAM_IDS, MAP_SET_V0_9_PROGRAM_IDS, MAP_SET_V0_10_PROGRAM_IDS, MAP_SET_V0_11_PROGRAM_IDS, requireLibraryProgramId, type LibraryProgramId } from "./wls-library-catalogue";
import { getCollectionProgramSource } from "./wls-library";
import { MAP_SET_V0_12_PROGRAM_IDS } from "./wls-library-catalogue";
import { MAP_SET_V0_13_PROGRAM_IDS } from "./wls-library-catalogue";
import { MAP_SET_V0_14_PROGRAM_IDS } from "./wls-library-catalogue";
import { MAP_SET_V0_15_PROGRAM_IDS } from "./wls-library-catalogue";
import { MAP_SET_V0_16_PROGRAM_IDS } from "./wls-library-catalogue";

export const COLLECTION_PACKAGE_PROFILE = "WLS-PACKAGE/1";
export const COLLECTION_PACKAGE_TEXT_LIMIT = 8_192;
/** Initial repository-local release identity, not a published registry package. */
export const COLLECTION_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.1.0", executionProfile: COLLECTION_PROFILE,
});
/** Retained latest string-list release; maps have a separate profile below. */
export const COLLECTION_LIBRARY_LATEST_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.2.0", executionProfile: COLLECTION_PROFILE,
});
/** Independent map-only release surface; retained releases are not redefined. */
export const MAP_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.3.0", executionProfile: MAP_PROFILE,
});
export const MAP_LIBRARY_LATEST_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.4.0", executionProfile: MAP_PROFILE,
});
/** Additive Map + map-backed string Set release; retained identities stay fixed. */
export const SET_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.5.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.6.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_7_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.7.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_8_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.8.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_9_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.9.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_10_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.10.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_11_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.11.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_12_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.12.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_13_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.13.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_14_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.14.0", executionProfile: MAP_PROFILE,
});
export const MAP_SET_V0_15_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.15.0", executionProfile: MAP_PROFILE,
});
const fail = (message: string): never => { throw new CollectionVMError(message); };
export const MAP_SET_V0_16_LIBRARY_RELEASE = Object.freeze({
  name: "wls.collections", version: "0.16.0", executionProfile: MAP_PROFILE,
});
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}
const version = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;

/** Validate all declared requirements against the fixed local packaged library. */
export function resolveCollectionPackage(text: string) {
  if (typeof text !== "string" || text.length > COLLECTION_PACKAGE_TEXT_LIMIT) fail("Package manifest exceeds its text limit.");
  let manifest: unknown;
  try { manifest = JSON.parse(text); } catch { fail("Package manifest must contain valid JSON."); }
  if (!record(manifest) || !exactKeys(manifest, [
    "profile", "name", "version", "executionProfile", "dependencies", "programs",
  ]) || manifest.profile !== COLLECTION_PACKAGE_PROFILE) return fail("Unsupported or malformed package manifest.");
  if (typeof manifest.name !== "string" || manifest.name.length > 64 ||
    !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(manifest.name)) fail("Invalid package name.");
  if (manifest.name === COLLECTION_LIBRARY_RELEASE.name) fail("A consumer package cannot depend on itself.");
  if (typeof manifest.version !== "string" || !version.test(manifest.version)) fail("Package version must be an exact bounded major.minor.patch version.");
  if (manifest.executionProfile !== COLLECTION_PROFILE && manifest.executionProfile !== MAP_PROFILE) fail("Unsupported package execution profile.");
  if (!record(manifest.dependencies) || !exactKeys(manifest.dependencies, [COLLECTION_LIBRARY_RELEASE.name])) {
    return fail("Declare only the supported local collection dependency.");
  }
  const requested = manifest.dependencies[COLLECTION_LIBRARY_RELEASE.name];
  const release = requested === COLLECTION_LIBRARY_RELEASE.version ? COLLECTION_LIBRARY_RELEASE :
    requested === COLLECTION_LIBRARY_LATEST_RELEASE.version ? COLLECTION_LIBRARY_LATEST_RELEASE :
    requested === MAP_LIBRARY_RELEASE.version ? MAP_LIBRARY_RELEASE :
    requested === MAP_LIBRARY_LATEST_RELEASE.version ? MAP_LIBRARY_LATEST_RELEASE :
    requested === SET_LIBRARY_RELEASE.version ? SET_LIBRARY_RELEASE :
    requested === MAP_SET_LIBRARY_RELEASE.version ? MAP_SET_LIBRARY_RELEASE :
    requested === MAP_SET_V0_7_LIBRARY_RELEASE.version ? MAP_SET_V0_7_LIBRARY_RELEASE :
    requested === MAP_SET_V0_8_LIBRARY_RELEASE.version ? MAP_SET_V0_8_LIBRARY_RELEASE :
    requested === MAP_SET_V0_9_LIBRARY_RELEASE.version ? MAP_SET_V0_9_LIBRARY_RELEASE :
    requested === MAP_SET_V0_10_LIBRARY_RELEASE.version ? MAP_SET_V0_10_LIBRARY_RELEASE :
    requested === MAP_SET_V0_11_LIBRARY_RELEASE.version ? MAP_SET_V0_11_LIBRARY_RELEASE :
    requested === MAP_SET_V0_12_LIBRARY_RELEASE.version ? MAP_SET_V0_12_LIBRARY_RELEASE :
    requested === MAP_SET_V0_13_LIBRARY_RELEASE.version ? MAP_SET_V0_13_LIBRARY_RELEASE :
    requested === MAP_SET_V0_14_LIBRARY_RELEASE.version ? MAP_SET_V0_14_LIBRARY_RELEASE :
    requested === MAP_SET_V0_15_LIBRARY_RELEASE.version ? MAP_SET_V0_15_LIBRARY_RELEASE :
    requested === MAP_SET_V0_16_LIBRARY_RELEASE.version ? MAP_SET_V0_16_LIBRARY_RELEASE :
      fail("Unsupported collection dependency version; an exact local version is required.");
  if (manifest.executionProfile !== release.executionProfile) fail("Dependency execution profile mismatch.");
  const allowedPrograms: readonly LibraryProgramId[] = release === COLLECTION_LIBRARY_RELEASE ? COLLECTION_V0_1_PROGRAM_IDS :
    release === MAP_LIBRARY_RELEASE ? MAP_PROGRAM_IDS :
    release === MAP_LIBRARY_LATEST_RELEASE ? MAP_V0_4_PROGRAM_IDS :
    release === SET_LIBRARY_RELEASE ? MAP_SET_V0_5_PROGRAM_IDS :
    release === MAP_SET_LIBRARY_RELEASE ? MAP_SET_V0_6_PROGRAM_IDS :
    release === MAP_SET_V0_7_LIBRARY_RELEASE ? MAP_SET_V0_7_PROGRAM_IDS :
    release === MAP_SET_V0_8_LIBRARY_RELEASE ? MAP_SET_V0_8_PROGRAM_IDS :
    release === MAP_SET_V0_9_LIBRARY_RELEASE ? MAP_SET_V0_9_PROGRAM_IDS :
    release === MAP_SET_V0_10_LIBRARY_RELEASE ? MAP_SET_V0_10_PROGRAM_IDS :
    release === MAP_SET_V0_11_LIBRARY_RELEASE ? MAP_SET_V0_11_PROGRAM_IDS :
    release === MAP_SET_V0_12_LIBRARY_RELEASE ? MAP_SET_V0_12_PROGRAM_IDS :
    release === MAP_SET_V0_13_LIBRARY_RELEASE ? MAP_SET_V0_13_PROGRAM_IDS :
    release === MAP_SET_V0_14_LIBRARY_RELEASE ? MAP_SET_V0_14_PROGRAM_IDS :
    release === MAP_SET_V0_15_LIBRARY_RELEASE ? MAP_SET_V0_15_PROGRAM_IDS :
    release === MAP_SET_V0_16_LIBRARY_RELEASE ? MAP_SET_V0_16_PROGRAM_IDS : COLLECTION_V0_2_PROGRAM_IDS;
  if (!Array.isArray(manifest.programs) || !manifest.programs.length ||
    manifest.programs.length > allowedPrograms.length) return fail("Declare a bounded nonempty program list.");
  const seen = new Set<LibraryProgramId>();
  const programs = manifest.programs.map((value: unknown) => {
    const id = requireLibraryProgramId(value);
    if (!allowedPrograms.includes(id)) fail("Program is not available in this dependency version.");
    if (seen.has(id)) fail("Duplicate package program.");
    seen.add(id);
    // A dependency declaration must not hide an invalid packaged program.
    const source = getCollectionProgramSource(id);
    if (executionProfile(source) !== release.executionProfile) fail("Packaged source execution profile mismatch.");
    compileLibraryProgram(source);
    return id;
  });
  return Object.freeze({
    profile: COLLECTION_PACKAGE_PROFILE,
    name: manifest.name as string,
    version: manifest.version as string,
    executionProfile: release.executionProfile,
    dependencies: Object.freeze([release]),
    programs: Object.freeze(programs),
  });
}

/** Only fixed catalogue IDs explicitly declared by this manifest can be loaded. */
export function getCollectionPackageProgramSource(text: string, program: string): string {
  const manifest = resolveCollectionPackage(text);
  const id = requireLibraryProgramId(program);
  if (!manifest.programs.includes(id)) fail("Program is not declared by this package.");
  return getCollectionProgramSource(id);
}

/**
 * Source is resolved afresh, not accepted as caller-forged resolved bytecode.
 * The existing VM still validates inputs and owns all execution limits.
 */
export function executeCollectionPackageProgram(
  text: string, program: string, inputs: Readonly<Record<string, unknown>>,
) {
  return executeLibraryProgram(getCollectionPackageProgramSource(text, program), inputs);
}
