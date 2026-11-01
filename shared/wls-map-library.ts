import { CollectionVMError } from "./wls-collection-vm";
import { executeMap, type MapValue } from "./wls-map-vm";
import { getCollectionProgramSource } from "./wls-library";

export type { MapValue } from "./wls-map-vm";
export {
  mapTakeUntilValue, mapDropUntilValue, mapTakeLastWhileValue, mapDropLastWhileValue,
  mapDistinctValuesFirst, mapDistinctValuesLast, mapFilterByValueSet, mapRejectByValueSet,
  mapRemapValues, mapRemapValuesOrDefault, mapEqualsOrdered, mapCountChangedEntries,
  mapCountRemovedKeys, mapFindEntryByValue, mapFindLastEntryByValue, mapTakeWhileKeyIn,
  mapDropWhileKeyIn, mapTakeLastWhileKeyIn, mapDropLastWhileKeyIn,
} from "./wls-map-batch-library";
function run(id: string, inputs: Readonly<Record<string, unknown>>) {
  return executeMap(getCollectionProgramSource(id), inputs).value;
}
function map(value: unknown): MapValue {
  if (value === null || typeof value !== "object" || !("entries" in value)) {
    throw new CollectionVMError("Invalid map library result.");
  }
  return value as MapValue;
}
/** Host bridges only marshal values; the operations execute in WLS-MAP/1. */
export const mapEmpty = (): MapValue => map(run("map.empty", {}));
/** Zero-based insertion-order key position; -1 means absent. */
export function mapIndexOfKey(input: MapValue, key: string): number {
  const index = run("map.indexOfKey", { map: input, key });
  if (typeof index !== "number" || !Number.isSafeInteger(index)) throw new CollectionVMError("Invalid map key position.");
  return index;
}
function indexedString(id: string, inputs: Readonly<Record<string, unknown>>): string {
  const value = run(id, inputs);
  if (typeof value !== "string") throw new CollectionVMError("Invalid indexed map result.");
  return value;
}
/** Strict zero-based insertion-order value lookup; out-of-range indices fail. */
export const mapValueAt = (input: MapValue, index: number): string =>
  indexedString("map.valueAt", { map: input, index });
/** Out-of-range safe integers select fallback; malformed indices still fail. */
export const mapKeyAtOrDefault = (input: MapValue, index: number, fallback: string): string =>
  indexedString("map.keyAtOrDefault", { map: input, index, fallback });
export const mapValueAtOrDefault = (input: MapValue, index: number, fallback: string): string =>
  indexedString("map.valueAtOrDefault", { map: input, index, fallback });
export const mapCopy = (input: MapValue): MapValue => map(run("map.copy", { map: input }));
export const mapMoveToFront = (input: MapValue, key: string): MapValue =>
  map(run("map.moveToFront", { map: input, key }));
export const mapTakeWhileValue = (input: MapValue, value: string): MapValue =>
  map(run("map.takeWhileValue", { map: input, value }));
export const mapDropWhileValue = (input: MapValue, value: string): MapValue =>
  map(run("map.dropWhileValue", { map: input, value }));
export const mapTakeLast = (input: MapValue, count: number): MapValue =>
  map(run("map.takeLast", { map: input, count }));
export const mapDropLast = (input: MapValue, count: number): MapValue =>
  map(run("map.dropLast", { map: input, count }));
function batchInteger(id: string, inputs: Readonly<Record<string, unknown>>): number {
  const value = run(id, inputs);
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new CollectionVMError("Invalid map integer result.");
  return value;
}
export const mapIndexOfValue = (input: MapValue, value: string): number =>
  batchInteger("map.indexOfValue", { map: input, value });
export const mapLastIndexOfValue = (input: MapValue, value: string): number =>
  batchInteger("map.lastIndexOfValue", { map: input, value });
export const mapCountCommonKeys = (left: MapValue, right: MapValue): number =>
  batchInteger("map.countCommonKeys", { left, right });
export const mapCountMatchingEntries = (left: MapValue, right: MapValue): number =>
  batchInteger("map.countMatchingEntries", { left, right });
export const mapCountDistinctValues = (input: MapValue): number =>
  batchInteger("map.countDistinctValues", { map: input });
export function mapHasDuplicateValues(input: MapValue): boolean {
  const value = run("map.hasDuplicateValues", { map: input });
  if (typeof value !== "boolean") throw new CollectionVMError("Invalid map boolean result.");
  return value;
}
export const mapDeleteFirstValue = (input: MapValue, value: string): MapValue =>
  map(run("map.deleteFirstValue", { map: input, value }));
export const mapDeleteLastValue = (input: MapValue, value: string): MapValue =>
  map(run("map.deleteLastValue", { map: input, value }));
export const mapMergeIfAbsent = (left: MapValue, right: MapValue): MapValue =>
  map(run("map.mergeIfAbsent", { left, right }));
export const mapMergeExisting = (left: MapValue, right: MapValue): MapValue =>
  map(run("map.mergeExisting", { left, right }));
/** Value-checked immutable update, NOT an atomic operation on external storage. */
export const mapReplaceEntryIfValue = (input: MapValue, key: string, expected: string, replacement: string): MapValue =>
  map(run("map.replaceEntryIfValue", { map: input, key, expected, replacement }));
export const mapDeleteEntryIfValue = (input: MapValue, key: string, expected: string): MapValue =>
  map(run("map.deleteEntryIfValue", { map: input, key, expected }));
/** Move an existing entry last, keeping its payload; missing keys are not inserted. */
export const mapMoveToEnd = (input: MapValue, key: string): MapValue =>
  map(run("map.moveToEnd", { map: input, key }));
/** Swap existing payloads without moving keys; missing keys yield a fresh copy. */
export const mapSwapValues = (input: MapValue, first: string, second: string): MapValue =>
  map(run("map.swapValues", { map: input, first, second }));
/** Rename in place in insertion order; absent source or occupied destination is a no-op copy. */
export const mapRenameKeyIfAbsent = (input: MapValue, key: string, replacement: string): MapValue =>
  map(run("map.renameKeyIfAbsent", { map: input, key, replacement }));
export const mapSet = (input: MapValue, key: string, value: string): MapValue =>
  map(run("map.set", { map: input, key, value }));
/** Missing keys select fallback; empty string values are present values. */
export function mapGetOrDefault(input: MapValue, key: string, fallback: string): string {
  const value = run("map.getOrDefault", { map: input, key, fallback });
  if (typeof value !== "string") throw new CollectionVMError("Invalid map default result.");
  return value;
}
export const mapSetIfAbsent = (input: MapValue, key: string, value: string): MapValue =>
  map(run("map.setIfAbsent", { map: input, key, value }));
export const mapReplaceIfPresent = (input: MapValue, key: string, value: string): MapValue =>
  map(run("map.replaceIfPresent", { map: input, key, value }));
/** Counts are safe integers, clamped to [0, size]; order and payloads are kept. */
export const mapTake = (input: MapValue, count: number): MapValue =>
  map(run("map.take", { map: input, count }));
/** Ordered offset/count window; negative offset/count are clamped to zero. */
export const mapSlice = (input: MapValue, offset: number, count: number): MapValue =>
  map(run("map.slice", { map: input, offset, count }));
export const mapDrop = (input: MapValue, count: number): MapValue =>
  map(run("map.drop", { map: input, count }));
export const mapDelete = (input: MapValue, key: string): MapValue =>
  map(run("map.delete", { map: input, key }));
/** Right values win; existing left keys keep their insertion positions. */
export const mapMerge = (left: MapValue, right: MapValue): MapValue =>
  map(run("map.merge", { left, right }));
/** Common keys with LEFT values and insertion order, not entry/value equality. */
export const mapIntersection = (left: MapValue, right: MapValue): MapValue =>
  map(run("map.intersection", { left, right }));
/** Left entries whose keys are absent from right; values and order are kept. */
export const mapDifference = (left: MapValue, right: MapValue): MapValue =>
  map(run("map.difference", { left, right }));
export const mapFilterByValue = (input: MapValue, value: string): MapValue =>
  map(run("map.filterByValue", { map: input, value }));
export const mapRejectByValue = (input: MapValue, value: string): MapValue =>
  map(run("map.rejectByValue", { map: input, value }));
export function mapHasValue(input: MapValue, value: string): boolean {
  const found = run("map.hasValue", { map: input, value });
  if (typeof found !== "boolean") throw new CollectionVMError("Invalid map value predicate result.");
  return found;
}
export function mapCountValue(input: MapValue, value: string): number {
  const count = run("map.countValue", { map: input, value });
  if (typeof count !== "number") throw new CollectionVMError("Invalid map value count result.");
  return count;
}
/** First key in insertion order; fallback is required even when a match exists. */
export function mapFindKeyByValueOrDefault(input: MapValue, value: string, fallback: string): string {
  const key = run("map.findKeyByValueOrDefault", { map: input, value, fallback });
  if (typeof key !== "string") throw new CollectionVMError("Invalid map value lookup result.");
  return key;
}
/** Inverse keys keep first-value order; duplicate values select the last input key. */
export const mapInvertLast = (input: MapValue): MapValue =>
  map(run("map.invertLast", { map: input }));
/** Replace every exact matching payload, preserving keys and insertion order. */
export const mapReplaceValue = (input: MapValue, value: string, replacement: string): MapValue =>
  map(run("map.replaceValue", { map: input, value, replacement }));
/** Replace only the first/last matching value in input insertion order. */
export const mapReplaceFirstValue = (input: MapValue, value: string, replacement: string): MapValue =>
  map(run("map.replaceFirstValue", { map: input, value, replacement }));
export const mapReplaceLastValue = (input: MapValue, value: string, replacement: string): MapValue =>
  map(run("map.replaceLastValue", { map: input, value, replacement }));
export function mapFindLastKeyByValueOrDefault(input: MapValue, value: string, fallback: string): string {
  const key = run("map.findLastKeyByValueOrDefault", { map: input, value, fallback });
  if (typeof key !== "string") throw new CollectionVMError("Invalid last-key lookup result.");
  return key;
}
/** Inverse keys keep first-value order and the first input key for duplicates. */
export const mapInvertFirst = (input: MapValue): MapValue =>
  map(run("map.invertFirst", { map: input }));
export const mapIntersectionEntries = (left: MapValue, right: MapValue): MapValue =>
  map(run("map.intersectionEntries", { left, right }));
export const mapDifferenceEntries = (left: MapValue, right: MapValue): MapValue =>
  map(run("map.differenceEntries", { left, right }));
function comparison(id: string, left: MapValue, right: MapValue): boolean {
  const value = run(id, { left, right });
  if (typeof value !== "boolean") throw new CollectionVMError("Invalid map comparison result.");
  return value;
}
/** Compare keys and string payloads, independently of insertion order. */
export const mapEquals = (left: MapValue, right: MapValue): boolean => comparison("map.equals", left, right);
export const mapIsSubmap = (left: MapValue, right: MapValue): boolean => comparison("map.isSubmap", left, right);
export function mapGet(input: MapValue, key: string): string {
  const value = run("map.get", { map: input, key });
  if (typeof value !== "string") throw new CollectionVMError("Invalid map get result.");
  return value;
}
export function mapHas(input: MapValue, key: string): boolean {
  const value = run("map.has", { map: input, key });
  if (typeof value !== "boolean") throw new CollectionVMError("Invalid map has result.");
  return value;
}
export function mapSize(input: MapValue): number {
  const value = run("map.size", { map: input });
  if (typeof value !== "number") throw new CollectionVMError("Invalid map size result.");
  return value;
}
export function mapKeyAt(input: MapValue, index: number): string {
  const value = run("map.keyAt", { map: input, index });
  if (typeof value !== "string") throw new CollectionVMError("Invalid map keyAt result.");
  return value;
}
