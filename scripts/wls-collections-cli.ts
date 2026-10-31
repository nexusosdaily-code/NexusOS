import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { TextDecoder } from "node:util";
import {
  COLLECTION_LIMITS, CollectionVMError,
} from "../shared/wls-collection-vm";
import { compileLibraryProgram, executeLibraryProgram, executionProfile } from "../shared/wls-execution";
import { COLLECTION_TEST_LIMITS, runCollectionTestSuite, runLockedCollectionTestSuite } from "../shared/wls-test-runner";
import {
  COLLECTION_PACKAGE_TEXT_LIMIT, getCollectionPackageProgramSource, resolveCollectionPackage,
} from "../shared/wls-package";
import {
  COLLECTION_LOCK_TEXT_LIMIT, createCollectionPackageLock,
  getLockedCollectionPackageProgramSource, verifyCollectionPackageLock,
} from "../shared/wls-package-lock";

export const COLLECTION_CLI_INPUT_LIMIT = 16_384;
const usage = `Usage:
  tsx scripts/wls-collections-cli.ts compile <program.wls>
  tsx scripts/wls-collections-cli.ts run <program.wls> <inputs.json> [--trace]
  tsx scripts/wls-collections-cli.ts test <suite.json>
  tsx scripts/wls-collections-cli.ts package-check <manifest.json>
  tsx scripts/wls-collections-cli.ts package-run <manifest.json> <program-id> <inputs.json> [--trace]
  tsx scripts/wls-collections-cli.ts package-lock <manifest.json>
  tsx scripts/wls-collections-cli.ts package-verify <manifest.json> <lock.json>
  tsx scripts/wls-collections-cli.ts package-run-locked <manifest.json> <lock.json> <program-id> <inputs.json> [--trace]
  tsx scripts/wls-collections-cli.ts package-test-locked <manifest.json> <lock.json> <suite.json>

Local WLS-COLLECTION/1 and WLS-MAP/1 tooling only. No website, database or network is started.
The program has no filesystem, network, storage or financial instructions.
`;

/** Read an explicitly selected regular file with bounded bytes and strict UTF-8. */
async function readText(path: string, characters: number, label: string): Promise<string> {
  let file;
  try {
    // Opening a FIFO read-only can otherwise block before stat can reject it.
    file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
    const stat = await file.stat();
    const bytes = characters * 4;
    if (!stat.isFile()) throw new CollectionVMError(`${label} must be a regular file.`);
    if (stat.size > bytes) throw new CollectionVMError(`${label} exceeds its size limit.`);
    const buffer = Buffer.alloc(bytes + 1);
    let length = 0;
    while (length < buffer.length) {
      const result = await file.read(buffer, length, buffer.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length > bytes) throw new CollectionVMError(`${label} exceeds its size limit.`);
    let text: string;
    try {
      // Preserve any BOM so it counts toward the limit and is handled by the
      // source/JSON parser, rather than silently changing the selected file.
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, length));
    } catch {
      throw new CollectionVMError(`${label} must contain valid UTF-8.`);
    }
    if (text.length > characters) throw new CollectionVMError(`${label} exceeds its size limit.`);
    return text;
  } catch (error) {
    if (error instanceof CollectionVMError) throw error;
    throw new CollectionVMError(`Cannot read ${label.toLowerCase()} file.`);
  } finally {
    await file?.close();
  }
}

function parseInputs(text: string): Record<string, unknown> {
  let inputs: unknown;
  try { inputs = JSON.parse(text); } catch {
    throw new CollectionVMError("Inputs must contain valid JSON.");
  }
  if (inputs === null || typeof inputs !== "object" || Array.isArray(inputs)) {
    throw new CollectionVMError("Inputs must be a non-null JSON object.");
  }
  return inputs as Record<string, unknown>;
}

/**
 * Local developer adapter only: reads source/inputs, never accepts bytecode,
 * executes supplied JavaScript or imports the application/server.
 */
export async function runCollectionCommand(args: readonly string[]) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) return { help: usage };
  const [command, sourcePath, inputsPath, traceFlag] = args;
  const compile = command === "compile" && args.length === 2;
  const test = command === "test" && args.length === 2;
  const packageCheck = command === "package-check" && args.length === 2;
  const packageRun = command === "package-run" &&
    (args.length === 4 || (args.length === 5 && args[4] === "--trace"));
  const lock = command === "package-lock" && args.length === 2;
  const verify = command === "package-verify" && args.length === 3;
  const lockedRun = command === "package-run-locked" &&
    (args.length === 5 || (args.length === 6 && args[5] === "--trace"));
  const lockedTest = command === "package-test-locked" && args.length === 4;
  const run = command === "run" &&
    (args.length === 3 || (args.length === 4 && traceFlag === "--trace"));
  if (!compile && !run && !test && !packageCheck && !packageRun && !lock && !verify && !lockedRun && !lockedTest) {
    throw new CollectionVMError(usage.trimEnd());
  }
  if (lock || verify || lockedRun || lockedTest) {
    const text = await readText(sourcePath, COLLECTION_PACKAGE_TEXT_LIMIT, "Package manifest");
    if (lock) return await createCollectionPackageLock(text);
    const lockText = await readText(inputsPath, COLLECTION_LOCK_TEXT_LIMIT, "Lock");
    if (verify) return await verifyCollectionPackageLock(text, lockText);
    if (lockedTest) {
      const suite = await readText(args[3], COLLECTION_TEST_LIMITS.text, "Suite");
      return runLockedCollectionTestSuite(suite, text, lockText);
    }
    const source = await getLockedCollectionPackageProgramSource(text, lockText, args[3]);
    // Integrity and declaration checks finish before reading private inputs.
    const inputs = parseInputs(await readText(args[4], COLLECTION_CLI_INPUT_LIMIT, "Inputs"));
    const result = executeLibraryProgram(source, inputs);
    return {
      profile: executionProfile(source), integrity: "verified", program: args[3],
      value: result.value, cycles: result.trace.length,
      ...(args[5] === "--trace" ? { trace: result.trace } : {}),
    };
  }
  if (packageCheck || packageRun) {
    const text = await readText(sourcePath, COLLECTION_PACKAGE_TEXT_LIMIT, "Package manifest");
    if (packageCheck) return resolveCollectionPackage(text);
    // Validate declaration before reading the selected input file.
    const source = getCollectionPackageProgramSource(text, inputsPath);
    const inputs = parseInputs(await readText(args[3], COLLECTION_CLI_INPUT_LIMIT, "Inputs"));
    const result = executeLibraryProgram(source, inputs);
    return {
      profile: executionProfile(source), program: inputsPath,
      value: result.value, cycles: result.trace.length,
      ...(args[4] === "--trace" ? { trace: result.trace } : {}),
    };
  }
  if (test) return runCollectionTestSuite(await readText(sourcePath, COLLECTION_TEST_LIMITS.text, "Suite"));
  const source = await readText(sourcePath, COLLECTION_LIMITS.sourceLength, "Source");
  if (compile) return { profile: executionProfile(source), instructions: compileLibraryProgram(source) };
  const inputText = await readText(inputsPath, COLLECTION_CLI_INPUT_LIMIT, "Inputs");
  const result = executeLibraryProgram(source, parseInputs(inputText));
  return {
    profile: executionProfile(source), value: result.value, cycles: result.trace.length,
    ...(traceFlag === "--trace" ? { trace: result.trace } : {}),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCollectionCommand(process.argv.slice(2)).then(result => {
    process.stdout.write("help" in result ? result.help! : JSON.stringify(result, null, 2) + "\n");
    if ("failed" in result && typeof result.failed === "number" && result.failed > 0) process.exitCode = 1;
  }).catch(error => {
    // No stack, file paths, raw JSON parser diagnostics or file contents.
    process.stderr.write(`WLS collection error: ${error instanceof CollectionVMError ? error.message : "Command failed."}\n`);
    process.exitCode = 1;
  });
}
