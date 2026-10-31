import { CollectionVMError, executeCollection } from "./wls-collection-vm";
import { getCollectionProgramSource } from "./wls-library";

/**
 * Reusable bounded string-list programs for WLS-COLLECTION/1.
 * Search and concatenation run in the interpreter, not host array algorithms.
 * The temporary needle list also checks the search value's string type, even
 * for an empty input list, when the source is executed without these bridges.
 */
export const STRING_COLLECTION_SOURCE = Object.freeze({
  contains: getCollectionProgramSource("string.contains"),
  indexOf: getCollectionProgramSource("string.indexOf"),
  concat: getCollectionProgramSource("string.concat"),
  lastIndexOf: getCollectionProgramSource("string.lastIndexOf"),
  reverse: getCollectionProgramSource("string.reverse"),
});

/** Exact comparison: no trimming, case folding or Unicode normalisation. */
export function stringListContains(items: readonly string[], value: string): boolean {
  const result = executeCollection(STRING_COLLECTION_SOURCE.contains, { items, value }).value;
  if (typeof result !== "boolean") throw new CollectionVMError("Invalid contains result.");
  return result;
}

/** First zero-based match, or -1. This does not resolve or authorise addresses. */
export function stringListIndexOf(items: readonly string[], value: string): number {
  const result = executeCollection(STRING_COLLECTION_SOURCE.indexOf, { items, value }).value;
  if (typeof result !== "number") throw new CollectionVMError("Invalid indexOf result.");
  return result;
}

/** Preserves order and duplicates; fails if the combined list exceeds 20 items. */
export function stringListConcat(left: readonly string[], right: readonly string[]): string[] {
  const result = executeCollection(STRING_COLLECTION_SOURCE.concat, { left, right }).value;
  if (!Array.isArray(result)) throw new CollectionVMError("Invalid concat result.");
  return result;
}

/** Last zero-based exact match, or -1; the search value must be a string. */
export function stringListLastIndexOf(items: readonly string[], value: string): number {
  const result = executeCollection(STRING_COLLECTION_SOURCE.lastIndexOf, { items, value }).value;
  if (typeof result !== "number") throw new CollectionVMError("Invalid lastIndexOf result.");
  return result;
}

/** A fresh reversed list; values and duplicates are retained exactly. */
export function stringListReverse(items: readonly string[]): string[] {
  const result = executeCollection(STRING_COLLECTION_SOURCE.reverse, { items }).value;
  if (!Array.isArray(result)) throw new CollectionVMError("Invalid reverse result.");
  return result;
}
