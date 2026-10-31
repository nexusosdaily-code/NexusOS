import { readFile, writeFile } from "node:fs/promises";
import { collectionLibraryArtifactURL, renderCollectionLibraryArtifact } from "./wls-library-artifact";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
  throw new Error("Usage: generate-wls-library.ts [--check]");
}
const expected = await renderCollectionLibraryArtifact();
if (args[0] === "--check") {
  const actual = await readFile(collectionLibraryArtifactURL, "utf8");
  if (actual !== expected) {
    throw new Error("WLS library artifact is stale. Run npm run generate:wls-library.");
  }
  console.log("WLS library artifact matches all canonical programs.");
} else {
  await writeFile(collectionLibraryArtifactURL, expected, "utf8");
  console.log("Generated WLS library artifact from canonical programs.");
}
