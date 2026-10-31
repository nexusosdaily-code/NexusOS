import { COLLECTION_PROFILE, CollectionVMError, compileCollection, executeCollection, COLLECTION_LIMITS } from "./wls-collection-vm";
import { MAP_PROFILE, compileMap, executeMap } from "./wls-map-vm";

/** Explicit source-header dispatch; unknown profiles fail, never fall back. */
export function executionProfile(source: string) {
  if (typeof source !== "string" || source.length > COLLECTION_LIMITS.sourceLength) {
    throw new CollectionVMError("Library source exceeds its size limit.");
  }
  const header = source.split("\n", 1)[0].trim();
  // Keep legacy compiler diagnostics for unsupported headers.
  if (header !== MAP_PROFILE && header !== COLLECTION_PROFILE) compileCollection(source);
  return header;
}
export function compileLibraryProgram(source: string) {
  return executionProfile(source) === MAP_PROFILE ? compileMap(source) : compileCollection(source);
}
export function executeLibraryProgram(source: string, inputs: Readonly<Record<string, unknown>>) {
  return executionProfile(source) === MAP_PROFILE ? executeMap(source, inputs) : executeCollection(source, inputs);
}
