import boundaries from "./wls-cli-isolation-boundaries.cjs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  boundaries.checkImport(specifier);
  let result;
  try {
    result = await nextResolve(specifier, context);
  } catch (error) {
    // Match the extensionless local TS imports used by the CLI/shared modules.
    if (!["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"].includes(error.code) ||
        !specifier.startsWith(".") || /\.(?:[cm]?[jt]sx?|json|node)$/.test(specifier)) throw error;
    try {
      result = await nextResolve(specifier + ".ts", context);
    } catch (fileError) {
      if (fileError.code !== "ERR_MODULE_NOT_FOUND") throw fileError;
      result = await nextResolve(specifier + "/index.ts", context);
    }
  }
  boundaries.checkImport(specifier, result.url);
  return result;
}
export async function load(url, context, nextLoad) {
  boundaries.checkImport("", url);
  if (url.startsWith("file:") && extname(fileURLToPath(url)) === ".ts") {
    const { default: ts } = await import("typescript");
    const source = await readFile(new URL(url), "utf8");
    return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(source, {
        fileName: fileURLToPath(url),
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    };
  }
  return nextLoad(url, context);
}
