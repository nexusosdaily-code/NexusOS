import { CollectionVMError } from "./wls-collection-vm";
import { executeMap, type MapValue } from "./wls-map-vm";
import { getCollectionProgramSource } from "./wls-library";

/** Keys are members; every returned payload is the empty string. */
export type StringSetValue = { readonly entries: readonly (readonly [string, ""])[] };

function run(id: string, inputs: Readonly<Record<string, unknown>>) {
  return executeMap(getCollectionProgramSource(id), inputs).value;
}
function result(value: unknown): StringSetValue {
  if (value === null || typeof value !== "object" || !("entries" in value) ||
      !Array.isArray(value.entries) || value.entries.some(pair => !Array.isArray(pair) || pair[1] !== "")) {
    throw new CollectionVMError("Invalid string Set library result.");
  }
  return value as StringSetValue;
}

/** Host bridges marshal only. Valid input map payloads are intentionally ignored. */
export const setEmpty = (): StringSetValue => result(run("set.empty", {}));
/** Zero-based member position in insertion order; payloads are ignored. */
export function setIndexOf(set: MapValue, value: string): number {
  const index = run("set.indexOf", { set, value });
  if (typeof index !== "number" || !Number.isSafeInteger(index)) throw new CollectionVMError("Invalid Set member position.");
  return index;
}
/** Out-of-range safe integers select fallback; malformed operands still fail. */
export function setAtOrDefault(set: MapValue, index: number, fallback: string): string {
  const member = run("set.atOrDefault", { set, index, fallback });
  if (typeof member !== "string") throw new CollectionVMError("Invalid Set member result.");
  return member;
}
export const setFromMap = (map: MapValue): StringSetValue => result(run("set.fromMap", { map }));
/** Unique Map payloads in first-occurrence order; output payloads are empty. */
export const setFromValues = (map: MapValue): StringSetValue => result(run("set.fromValues", { map }));
/** Ordered member selection; returned payloads are always empty strings. */
export const setTake = (set: MapValue, count: number): StringSetValue => result(run("set.take", { set, count }));
/** Ordered offset/count window with canonical empty-string payloads. */
export const setSlice = (set: MapValue, offset: number, count: number): StringSetValue =>
  result(run("set.slice", { set, offset, count }));
export const setDrop = (set: MapValue, count: number): StringSetValue => result(run("set.drop", { set, count }));
export const setAdd = (set: MapValue, value: string): StringSetValue => result(run("set.add", { set, value }));
export const setDelete = (set: MapValue, value: string): StringSetValue => result(run("set.delete", { set, value }));
export const setUnion = (left: MapValue, right: MapValue): StringSetValue => result(run("set.union", { left, right }));
export const setIntersection = (left: MapValue, right: MapValue): StringSetValue => result(run("set.intersection", { left, right }));
export const setDifference = (left: MapValue, right: MapValue): StringSetValue => result(run("set.difference", { left, right }));
export const setSymmetricDifference = (left: MapValue, right: MapValue): StringSetValue => result(run("set.symmetricDifference", { left, right }));
function predicate(id: string, left: MapValue, right: MapValue): boolean {
  const value = run(id, { left, right });
  if (typeof value !== "boolean") throw new CollectionVMError("Invalid string Set predicate result.");
  return value;
}
/** Key membership only: payloads and insertion order do not affect comparisons. */
export const setIsSubset = (left: MapValue, right: MapValue): boolean => predicate("set.isSubset", left, right);
export const setIsDisjoint = (left: MapValue, right: MapValue): boolean => predicate("set.isDisjoint", left, right);
export const setEquals = (left: MapValue, right: MapValue): boolean => predicate("set.equals", left, right);
export function setSize(set: MapValue): number {
  const value = run("set.size", { set });
  if (typeof value !== "number") throw new CollectionVMError("Invalid string Set size result.");
  return value;
}
export function setHas(set: MapValue, value: string): boolean {
  const found = run("set.has", { set, value });
  if (typeof found !== "boolean") throw new CollectionVMError("Invalid string Set membership result.");
  return found;
}
export function setAt(set: MapValue, index: number): string {
  const value = run("set.at", { set, index });
  if (typeof value !== "string") throw new CollectionVMError("Invalid string Set index result.");
  return value;
}
