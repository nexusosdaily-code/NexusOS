import { executeMap, type MapValue } from "./wls-map-vm";
import { getCollectionProgramSource } from "./wls-library";
import { CollectionVMError } from "./wls-library-compiler";
import type { LibraryProgramId } from "./wls-library-catalogue";

/** Marshal-only bridges. Algorithms execute canonical WLS-MAP/1 source. */
function run(id: LibraryProgramId, inputs: Readonly<Record<string, unknown>>) {
  return executeMap(getCollectionProgramSource(id), inputs).value;
}
function mapResult(id: LibraryProgramId, inputs: Readonly<Record<string, unknown>>): MapValue {
  const value = run(id, inputs);
  if (!value || typeof value !== "object" || !("entries" in value)) {
    throw new CollectionVMError("Invalid native map result.");
  }
  return value as MapValue;
}
function predicate(id: LibraryProgramId, left: MapValue, right: MapValue): boolean {
  const value = run(id, { left, right });
  if (typeof value !== "boolean") throw new CollectionVMError("Invalid ordered equality result.");
  return value;
}
function count(id: LibraryProgramId, left: MapValue, right: MapValue): number {
  const value = run(id, { left, right });
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new CollectionVMError("Invalid change count.");
  return value;
}
export const mapTakeUntilValue = (map: MapValue, value: string) => mapResult("map.takeUntilValue", { map, value });
export const mapDropUntilValue = (map: MapValue, value: string) => mapResult("map.dropUntilValue", { map, value });
export const mapTakeLastWhileValue = (map: MapValue, value: string) => mapResult("map.takeLastWhileValue", { map, value });
export const mapDropLastWhileValue = (map: MapValue, value: string) => mapResult("map.dropLastWhileValue", { map, value });
export const mapDistinctValuesFirst = (map: MapValue) => mapResult("map.distinctValuesFirst", { map });
export const mapDistinctValuesLast = (map: MapValue) => mapResult("map.distinctValuesLast", { map });
export const mapFilterByValueSet = (map: MapValue, right: MapValue) => mapResult("map.filterByValueSet", { map, right });
export const mapRejectByValueSet = (map: MapValue, right: MapValue) => mapResult("map.rejectByValueSet", { map, right });
/** Single lookup per original payload; replacement values are not recursively remapped. */
export const mapRemapValues = (map: MapValue, right: MapValue) => mapResult("map.remapValues", { map, right });
export const mapRemapValuesOrDefault = (map: MapValue, right: MapValue, fallback: string) =>
  mapResult("map.remapValuesOrDefault", { map, right, fallback });
export const mapEqualsOrdered = (left: MapValue, right: MapValue) => predicate("map.equalsOrdered", left, right);
export const setEqualsOrdered = (left: MapValue, right: MapValue) => predicate("set.equalsOrdered", left, right);
/** Counts changes only for shared keys, not additions/removals. */
export const mapCountChangedEntries = (left: MapValue, right: MapValue) => count("map.countChangedEntries", left, right);
export const mapCountRemovedKeys = (left: MapValue, right: MapValue) => count("map.countRemovedKeys", left, right);
export const mapFindEntryByValue = (map: MapValue, value: string) => mapResult("map.findEntryByValue", { map, value });
export const mapFindLastEntryByValue = (map: MapValue, value: string) => mapResult("map.findLastEntryByValue", { map, value });
export const mapTakeWhileKeyIn = (map: MapValue, right: MapValue) => mapResult("map.takeWhileKeyIn", { map, right });
export const mapDropWhileKeyIn = (map: MapValue, right: MapValue) => mapResult("map.dropWhileKeyIn", { map, right });
export const mapTakeLastWhileKeyIn = (map: MapValue, right: MapValue) => mapResult("map.takeLastWhileKeyIn", { map, right });
export const mapDropLastWhileKeyIn = (map: MapValue, right: MapValue) => mapResult("map.dropLastWhileKeyIn", { map, right });
