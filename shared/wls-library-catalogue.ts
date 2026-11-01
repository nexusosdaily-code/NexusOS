import { CollectionVMError } from "./wls-library-compiler";

/** Fixed local catalogue, not a module resolver or a path/URL import facility. */
const COLLECTION_V0_1_PROGRAM_FILES = Object.freeze({
  "string.contains": "string/contains.wls",
  "string.indexOf": "string/indexOf.wls",
  "string.concat": "string/concat.wls",
  "recipient.add": "recipient/add.wls",
  "recipient.remove": "recipient/remove.wls",
  "recipient.count": "recipient/count.wls",
  "recipient.at": "recipient/at.wls",
} as const);

const COLLECTION_V0_2_PROGRAM_FILES = Object.freeze({
  ...COLLECTION_V0_1_PROGRAM_FILES,
  "string.lastIndexOf": "string/lastIndexOf.wls",
  "string.reverse": "string/reverse.wls",
} as const);
export const COLLECTION_PROGRAM_FILES = COLLECTION_V0_2_PROGRAM_FILES;

export type CollectionProgramId = keyof typeof COLLECTION_PROGRAM_FILES;
/** Retained release surface: new catalogue entries must not enter old manifests. */
export const COLLECTION_V0_1_PROGRAM_IDS: readonly CollectionProgramId[] =
  Object.freeze(Object.keys(COLLECTION_V0_1_PROGRAM_FILES) as CollectionProgramId[]);
export const COLLECTION_V0_2_PROGRAM_IDS: readonly CollectionProgramId[] =
  Object.freeze(Object.keys(COLLECTION_V0_2_PROGRAM_FILES) as CollectionProgramId[]);
export const COLLECTION_PROGRAM_IDS = COLLECTION_V0_2_PROGRAM_IDS;

/** New execution profile, deliberately separate from retained string-list IDs. */
export const MAP_PROGRAM_FILES = Object.freeze({
  "map.empty": "map/empty.wls",
  "map.copy": "map/copy.wls",
  "map.size": "map/size.wls",
  "map.has": "map/has.wls",
  "map.get": "map/get.wls",
  "map.set": "map/set.wls",
  "map.delete": "map/delete.wls",
  "map.keyAt": "map/keyAt.wls",
} as const);
export const MAP_PROGRAM_IDS = Object.freeze(Object.keys(MAP_PROGRAM_FILES) as (keyof typeof MAP_PROGRAM_FILES)[]);
/** Additive map composition release; the 0.3.0 surface above remains fixed. */
export const MAP_V0_4_PROGRAM_FILES = Object.freeze({
  ...MAP_PROGRAM_FILES,
  "map.merge": "map/merge.wls",
  "map.intersection": "map/intersection.wls",
  "map.difference": "map/difference.wls",
} as const);
export const MAP_V0_4_PROGRAM_IDS = Object.freeze(Object.keys(MAP_V0_4_PROGRAM_FILES) as (keyof typeof MAP_V0_4_PROGRAM_FILES)[]);
/** Map-backed string-key Sets, without adding a new interpreter value type. */
export const SET_PROGRAM_FILES = Object.freeze({
  "set.empty": "set/empty.wls",
  "set.fromMap": "set/fromMap.wls",
  "set.size": "set/size.wls",
  "set.has": "set/has.wls",
  "set.add": "set/add.wls",
  "set.delete": "set/delete.wls",
  "set.at": "set/at.wls",
  "set.union": "set/union.wls",
  "set.intersection": "set/intersection.wls",
  "set.difference": "set/difference.wls",
} as const);
export const SET_PROGRAM_IDS = Object.freeze(Object.keys(SET_PROGRAM_FILES) as (keyof typeof SET_PROGRAM_FILES)[]);
export const MAP_SET_V0_5_PROGRAM_FILES = Object.freeze({ ...MAP_V0_4_PROGRAM_FILES, ...SET_PROGRAM_FILES });
export const MAP_SET_V0_5_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_5_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_5_PROGRAM_FILES)[]);
/** Additive value operations and key-set predicates; old releases stay fixed. */
export const MAP_SET_V0_6_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_5_PROGRAM_FILES,
  "map.filterByValue": "map/filterByValue.wls",
  "map.rejectByValue": "map/rejectByValue.wls",
  "map.invertLast": "map/invertLast.wls",
  "set.isSubset": "set/isSubset.wls",
  "set.isDisjoint": "set/isDisjoint.wls",
  "set.equals": "set/equals.wls",
} as const);
export const MAP_SET_V0_6_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_6_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_6_PROGRAM_FILES)[]);
export const MAP_SET_V0_7_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_6_PROGRAM_FILES,
  "map.equals": "map/equals.wls",
  "map.isSubmap": "map/isSubmap.wls",
  "map.intersectionEntries": "map/intersectionEntries.wls",
  "map.differenceEntries": "map/differenceEntries.wls",
  "set.symmetricDifference": "set/symmetricDifference.wls",
} as const);
export const MAP_SET_V0_7_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_7_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_7_PROGRAM_FILES)[]);
export const MAP_SET_V0_8_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_7_PROGRAM_FILES,
  "map.getOrDefault": "map/getOrDefault.wls",
  "map.setIfAbsent": "map/setIfAbsent.wls",
  "map.replaceIfPresent": "map/replaceIfPresent.wls",
} as const);
export const MAP_SET_V0_8_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_8_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_8_PROGRAM_FILES)[]);
export const MAP_SET_V0_9_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_8_PROGRAM_FILES,
  "map.take": "map/take.wls",
  "map.drop": "map/drop.wls",
  "set.take": "set/take.wls",
  "set.drop": "set/drop.wls",
} as const);
export const MAP_SET_V0_9_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_9_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_9_PROGRAM_FILES)[]);
export const MAP_SET_V0_10_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_9_PROGRAM_FILES,
  "map.hasValue": "map/hasValue.wls",
  "map.countValue": "map/countValue.wls",
  "map.findKeyByValueOrDefault": "map/findKeyByValueOrDefault.wls",
} as const);
export const MAP_SET_V0_10_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_10_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_10_PROGRAM_FILES)[]);
export const MAP_SET_V0_11_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_10_PROGRAM_FILES,
  "map.replaceValue": "map/replaceValue.wls",
  "map.invertFirst": "map/invertFirst.wls",
  "set.fromValues": "set/fromValues.wls",
} as const);
export const MAP_SET_V0_11_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_11_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_11_PROGRAM_FILES)[]);
export const MAP_SET_V0_12_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_11_PROGRAM_FILES,
  "map.findLastKeyByValueOrDefault": "map/findLastKeyByValueOrDefault.wls",
  "map.replaceFirstValue": "map/replaceFirstValue.wls",
  "map.replaceLastValue": "map/replaceLastValue.wls",
} as const);
export const MAP_SET_V0_12_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_12_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_12_PROGRAM_FILES)[]);
export const MAP_SET_V0_13_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_12_PROGRAM_FILES,
  "map.valueAt": "map/valueAt.wls",
  "map.keyAtOrDefault": "map/keyAtOrDefault.wls",
  "map.valueAtOrDefault": "map/valueAtOrDefault.wls",
} as const);
export const MAP_SET_V0_13_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_13_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_13_PROGRAM_FILES)[]);
export const MAP_SET_V0_14_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_13_PROGRAM_FILES,
  "map.indexOfKey": "map/indexOfKey.wls",
  "set.indexOf": "set/indexOf.wls",
  "set.atOrDefault": "set/atOrDefault.wls",
} as const);
export const MAP_SET_V0_14_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_14_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_14_PROGRAM_FILES)[]);
export const MAP_SET_V0_15_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_14_PROGRAM_FILES,
  "map.slice": "map/slice.wls",
  "set.slice": "set/slice.wls",
} as const);
export const MAP_SET_V0_15_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_15_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_15_PROGRAM_FILES)[]);
export const MAP_SET_V0_16_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_15_PROGRAM_FILES,
  "map.renameKeyIfAbsent": "map/renameKeyIfAbsent.wls",
  "set.replaceIfAbsent": "set/replaceIfAbsent.wls",
} as const);
export const MAP_SET_V0_16_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_16_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_16_PROGRAM_FILES)[]);
export const MAP_SET_V0_17_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_16_PROGRAM_FILES,
  "map.swapValues": "map/swapValues.wls",
  "set.toggle": "set/toggle.wls",
} as const);
export const MAP_SET_V0_17_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_17_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_17_PROGRAM_FILES)[]);
export const MAP_SET_V0_18_PROGRAM_FILES = Object.freeze({
  ...MAP_SET_V0_17_PROGRAM_FILES,
  "map.moveToEnd": "map/moveToEnd.wls",
  "set.moveToEnd": "set/moveToEnd.wls",
} as const);
export const MAP_SET_V0_18_PROGRAM_IDS = Object.freeze(Object.keys(MAP_SET_V0_18_PROGRAM_FILES) as (keyof typeof MAP_SET_V0_18_PROGRAM_FILES)[]);
export const MAP_SET_V0_19_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_18_PROGRAM_FILES,
  "map.moveToFront": "map/moveToFront.wls", "set.moveToFront": "set/moveToFront.wls" } as const);
export const MAP_SET_V0_20_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_19_PROGRAM_FILES,
  "map.takeWhileValue": "map/takeWhileValue.wls", "map.dropWhileValue": "map/dropWhileValue.wls" } as const);
export const MAP_SET_V0_21_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_20_PROGRAM_FILES,
  "map.takeLast": "map/takeLast.wls", "set.takeLast": "set/takeLast.wls" } as const);
export const MAP_SET_V0_22_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_21_PROGRAM_FILES,
  "map.dropLast": "map/dropLast.wls", "set.dropLast": "set/dropLast.wls" } as const);
export const MAP_SET_V0_23_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_22_PROGRAM_FILES,
  "map.indexOfValue": "map/indexOfValue.wls", "map.lastIndexOfValue": "map/lastIndexOfValue.wls" } as const);
export const MAP_SET_V0_24_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_23_PROGRAM_FILES,
  "map.countCommonKeys": "map/countCommonKeys.wls", "map.countMatchingEntries": "map/countMatchingEntries.wls" } as const);
export const MAP_SET_V0_25_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_24_PROGRAM_FILES,
  "map.countDistinctValues": "map/countDistinctValues.wls", "map.hasDuplicateValues": "map/hasDuplicateValues.wls" } as const);
export const MAP_SET_V0_26_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_25_PROGRAM_FILES,
  "map.deleteFirstValue": "map/deleteFirstValue.wls", "map.deleteLastValue": "map/deleteLastValue.wls" } as const);
export const MAP_SET_V0_27_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_26_PROGRAM_FILES,
  "set.intersectionSize": "set/intersectionSize.wls", "set.unionSize": "set/unionSize.wls" } as const);
export const MAP_SET_V0_28_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_27_PROGRAM_FILES,
  "set.differenceSize": "set/differenceSize.wls", "set.symmetricDifferenceSize": "set/symmetricDifferenceSize.wls" } as const);
export const MAP_SET_V0_29_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_28_PROGRAM_FILES,
  "map.mergeIfAbsent": "map/mergeIfAbsent.wls", "map.mergeExisting": "map/mergeExisting.wls" } as const);
export const MAP_SET_V0_30_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_29_PROGRAM_FILES,
  "map.replaceEntryIfValue": "map/replaceEntryIfValue.wls", "map.deleteEntryIfValue": "map/deleteEntryIfValue.wls" } as const);
export const MAP_SET_V0_31_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_30_PROGRAM_FILES,
  "map.takeUntilValue": "map/takeUntilValue.wls", "map.dropUntilValue": "map/dropUntilValue.wls" } as const);
export const MAP_SET_V0_32_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_31_PROGRAM_FILES,
  "map.takeLastWhileValue": "map/takeLastWhileValue.wls", "map.dropLastWhileValue": "map/dropLastWhileValue.wls" } as const);
export const MAP_SET_V0_33_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_32_PROGRAM_FILES,
  "map.distinctValuesFirst": "map/distinctValuesFirst.wls", "map.distinctValuesLast": "map/distinctValuesLast.wls" } as const);
export const MAP_SET_V0_34_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_33_PROGRAM_FILES,
  "map.filterByValueSet": "map/filterByValueSet.wls", "map.rejectByValueSet": "map/rejectByValueSet.wls" } as const);
export const MAP_SET_V0_35_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_34_PROGRAM_FILES,
  "map.remapValues": "map/remapValues.wls", "map.remapValuesOrDefault": "map/remapValuesOrDefault.wls" } as const);
export const MAP_SET_V0_36_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_35_PROGRAM_FILES,
  "map.equalsOrdered": "map/equalsOrdered.wls", "set.equalsOrdered": "set/equalsOrdered.wls" } as const);
export const MAP_SET_V0_37_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_36_PROGRAM_FILES,
  "map.countChangedEntries": "map/countChangedEntries.wls", "map.countRemovedKeys": "map/countRemovedKeys.wls" } as const);
export const MAP_SET_V0_38_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_37_PROGRAM_FILES,
  "map.findEntryByValue": "map/findEntryByValue.wls", "map.findLastEntryByValue": "map/findLastEntryByValue.wls" } as const);
export const MAP_SET_V0_39_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_38_PROGRAM_FILES,
  "map.takeWhileKeyIn": "map/takeWhileKeyIn.wls", "map.dropWhileKeyIn": "map/dropWhileKeyIn.wls" } as const);
export const MAP_SET_V0_40_PROGRAM_FILES = Object.freeze({ ...MAP_SET_V0_39_PROGRAM_FILES,
  "map.takeLastWhileKeyIn": "map/takeLastWhileKeyIn.wls", "map.dropLastWhileKeyIn": "map/dropLastWhileKeyIn.wls" } as const);
/** Fixed, cumulative surfaces. Never infer older versions from the current catalogue. */
export const MAP_SET_BATCH_SURFACES = Object.freeze({
  "0.19.0": MAP_SET_V0_19_PROGRAM_FILES, "0.20.0": MAP_SET_V0_20_PROGRAM_FILES,
  "0.21.0": MAP_SET_V0_21_PROGRAM_FILES, "0.22.0": MAP_SET_V0_22_PROGRAM_FILES,
  "0.23.0": MAP_SET_V0_23_PROGRAM_FILES, "0.24.0": MAP_SET_V0_24_PROGRAM_FILES,
  "0.25.0": MAP_SET_V0_25_PROGRAM_FILES, "0.26.0": MAP_SET_V0_26_PROGRAM_FILES,
  "0.27.0": MAP_SET_V0_27_PROGRAM_FILES, "0.28.0": MAP_SET_V0_28_PROGRAM_FILES,
  "0.29.0": MAP_SET_V0_29_PROGRAM_FILES, "0.30.0": MAP_SET_V0_30_PROGRAM_FILES,
  "0.31.0": MAP_SET_V0_31_PROGRAM_FILES, "0.32.0": MAP_SET_V0_32_PROGRAM_FILES,
  "0.33.0": MAP_SET_V0_33_PROGRAM_FILES, "0.34.0": MAP_SET_V0_34_PROGRAM_FILES,
  "0.35.0": MAP_SET_V0_35_PROGRAM_FILES, "0.36.0": MAP_SET_V0_36_PROGRAM_FILES,
  "0.37.0": MAP_SET_V0_37_PROGRAM_FILES, "0.38.0": MAP_SET_V0_38_PROGRAM_FILES,
  "0.39.0": MAP_SET_V0_39_PROGRAM_FILES, "0.40.0": MAP_SET_V0_40_PROGRAM_FILES,
});
export const LIBRARY_PROGRAM_FILES = Object.freeze({ ...COLLECTION_PROGRAM_FILES, ...MAP_SET_V0_40_PROGRAM_FILES });
export type LibraryProgramId = keyof typeof LIBRARY_PROGRAM_FILES;
export const LIBRARY_PROGRAM_IDS = Object.freeze(Object.keys(LIBRARY_PROGRAM_FILES) as LibraryProgramId[]);

export function requireLibraryProgramId(program: unknown): LibraryProgramId {
  if (typeof program !== "string" || !Object.prototype.hasOwnProperty.call(LIBRARY_PROGRAM_FILES, program)) {
    throw new CollectionVMError("Unknown collection library program.");
  }
  return program as LibraryProgramId;
}

/** Check before any indexing or I/O, including inherited object-property names. */
export function requireCollectionProgramId(program: unknown): CollectionProgramId {
  if (typeof program !== "string" || !Object.prototype.hasOwnProperty.call(COLLECTION_PROGRAM_FILES, program)) {
    throw new CollectionVMError("Unknown collection library program.");
  }
  return program as CollectionProgramId;
}
