import { readFile } from "node:fs/promises";
import { LIBRARY_PROGRAM_FILES, requireLibraryProgramId } from "./wls-library-catalogue";

/**
 * Node source-tree tooling only. Ship the adjacent wls-library/ directory when
 * using this entry; browser/server bundles should use ./wls-library instead.
 * Never resolves caller-provided paths, URLs or network imports.
 */
export async function readCollectionProgramSource(program: string): Promise<string> {
  const id = requireLibraryProgramId(program);
  return readFile(new URL(`./wls-library/${LIBRARY_PROGRAM_FILES[id]}`, import.meta.url), "utf8");
}
