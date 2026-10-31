import { requireLibraryProgramId } from "./wls-library-catalogue";
import { COLLECTION_LIBRARY_SOURCES } from "./wls-library-sources.generated";

export { COLLECTION_PROGRAM_IDS, type CollectionProgramId } from "./wls-library-catalogue";
export { MAP_PROGRAM_IDS, MAP_V0_4_PROGRAM_IDS, SET_PROGRAM_IDS, MAP_SET_V0_5_PROGRAM_IDS, MAP_SET_V0_6_PROGRAM_IDS, MAP_SET_V0_7_PROGRAM_IDS, LIBRARY_PROGRAM_IDS, type LibraryProgramId } from "./wls-library-catalogue";

/**
 * Synchronous browser/Node loading, with no fetch, filesystem or runtime imports.
 * Strings are generated verbatim from the canonical local .wls files.
 * Loading does not execute the source or grant any VM capability.
 */
export function getCollectionProgramSource(program: string): string {
  return COLLECTION_LIBRARY_SOURCES[requireLibraryProgramId(program)];
}
