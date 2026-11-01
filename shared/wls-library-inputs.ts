import { COLLECTION_LIBRARY_SOURCES } from "./wls-library-sources.generated";

type Kind = "list" | "map" | "string" | "integer";
type Contract = Readonly<Record<string, Kind>>;
/** Canonical library ABI only; custom source retains the profile's VM semantics. */
const contracts = {
  "string.contains": { items: "list", value: "string" },
  "string.indexOf": { items: "list", value: "string" },
  "string.concat": { left: "list", right: "list" },
  "recipient.add": { items: "list", value: "string" },
  "recipient.remove": { items: "list", value: "string" },
  "recipient.count": { items: "list" },
  "recipient.at": { items: "list", index: "integer" },
  "string.lastIndexOf": { items: "list", value: "string" },
  "string.reverse": { items: "list" },
  "map.empty": {},
  "map.copy": { map: "map" },
  "map.renameKeyIfAbsent": { map: "map", key: "string", replacement: "string" },
  "map.swapValues": { map: "map", first: "string", second: "string" },
  "map.moveToEnd": { map: "map", key: "string" },
  "set.moveToEnd": { set: "map", value: "string" },
  "set.toggle": { set: "map", value: "string" },
  "set.replaceIfAbsent": { set: "map", value: "string", replacement: "string" },
  "map.size": { map: "map" },
  "map.has": { map: "map", key: "string" },
  "map.get": { map: "map", key: "string" },
  "map.set": { map: "map", key: "string", value: "string" },
  "map.delete": { map: "map", key: "string" },
  "map.keyAt": { map: "map", index: "integer" },
  "map.indexOfKey": { map: "map", key: "string" },
  "map.valueAt": { map: "map", index: "integer" },
  "map.keyAtOrDefault": { map: "map", index: "integer", fallback: "string" },
  "map.valueAtOrDefault": { map: "map", index: "integer", fallback: "string" },
  "map.merge": { left: "map", right: "map" },
  "map.intersection": { left: "map", right: "map" },
  "map.difference": { left: "map", right: "map" },
  "set.empty": {},
  "set.fromMap": { map: "map" },
  "set.size": { set: "map" },
  "set.has": { set: "map", value: "string" },
  "set.add": { set: "map", value: "string" },
  "set.delete": { set: "map", value: "string" },
  "set.at": { set: "map", index: "integer" },
  "set.indexOf": { set: "map", value: "string" },
  "set.atOrDefault": { set: "map", index: "integer", fallback: "string" },
  "set.union": { left: "map", right: "map" },
  "set.intersection": { left: "map", right: "map" },
  "set.difference": { left: "map", right: "map" },
  "map.filterByValue": { map: "map", value: "string" },
  "map.rejectByValue": { map: "map", value: "string" },
  "map.invertLast": { map: "map" },
  "set.isSubset": { left: "map", right: "map" },
  "set.isDisjoint": { left: "map", right: "map" },
  "set.equals": { left: "map", right: "map" },
  "map.equals": { left: "map", right: "map" },
  "map.isSubmap": { left: "map", right: "map" },
  "map.intersectionEntries": { left: "map", right: "map" },
  "map.differenceEntries": { left: "map", right: "map" },
  "set.symmetricDifference": { left: "map", right: "map" },
  "map.getOrDefault": { map: "map", key: "string", fallback: "string" },
  "map.setIfAbsent": { map: "map", key: "string", value: "string" },
  "map.replaceIfPresent": { map: "map", key: "string", value: "string" },
  "map.take": { map: "map", count: "integer" },
  "map.slice": { map: "map", offset: "integer", count: "integer" },
  "map.drop": { map: "map", count: "integer" },
  "set.take": { set: "map", count: "integer" },
  "set.slice": { set: "map", offset: "integer", count: "integer" },
  "set.drop": { set: "map", count: "integer" },
  "map.hasValue": { map: "map", value: "string" },
  "map.countValue": { map: "map", value: "string" },
  "map.findKeyByValueOrDefault": { map: "map", value: "string", fallback: "string" },
  "map.replaceValue": { map: "map", value: "string", replacement: "string" },
  "map.replaceFirstValue": { map: "map", value: "string", replacement: "string" },
  "map.replaceLastValue": { map: "map", value: "string", replacement: "string" },
  "map.findLastKeyByValueOrDefault": { map: "map", value: "string", fallback: "string" },
  "map.invertFirst": { map: "map" },
  "set.fromValues": { map: "map" },
} satisfies Record<keyof typeof COLLECTION_LIBRARY_SOURCES, Contract>;

const bySource = new Map<string, readonly (readonly [string, Kind])[]>();
for (const id of Object.keys(contracts) as (keyof typeof contracts)[]) {
  const contract = Object.freeze(Object.entries(contracts[id]).map(
    ([name, kind]) => Object.freeze([name, kind] as const),
  ));
  const source = COLLECTION_LIBRARY_SOURCES[id];
  const previous = bySource.get(source);
  // Identical source aliases must never select conflicting argument contracts.
  if (previous && JSON.stringify(previous) !== JSON.stringify(contract)) {
    throw new Error("Conflicting canonical library input contracts.");
  }
  bySource.set(source, contract);
}

/** No inputs are read here. The interpreter validates its already-safe snapshot. */
export function canonicalLibraryInputs(source: string) {
  return bySource.get(source) ?? [];
}
