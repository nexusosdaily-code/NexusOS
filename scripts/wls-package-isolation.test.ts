import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile, chmod, readdir, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import * as nodeModule from "node:module";
import { COLLECTION_CLI_INPUT_LIMIT } from "./wls-collections-cli";
import { COLLECTION_LIMITS } from "../shared/wls-collection-vm";
import { COLLECTION_TEST_LIMITS } from "../shared/wls-test-runner";
import { COLLECTION_PACKAGE_TEXT_LIMIT } from "../shared/wls-package";
import { COLLECTION_LOCK_TEXT_LIMIT } from "../shared/wls-package-lock";

const cli = resolve("scripts/wls-collections-cli.ts");
const guard = resolve("scripts/fixtures/wls-cli-isolation-guard.cjs");

const DIAGNOSTIC_SCAN_LIMIT = 4096;
const DIAGNOSTIC_LIMIT = 1024;

// Never echo error messages, source excerpts, argv, stdout or environment values:
// even stderr from a rejected input may contain that input. Keep only structural
// error identifiers and fixed test/CLI markers, with bounded scanning and output.
function childDiagnostics(child: ReturnType<typeof spawnSync>): string {
  const stderr = String(child.stderr ?? "");
  const scanned = stderr.slice(0, DIAGNOSTIC_SCAN_LIMIT);
  const markers = new Set<string>();
  if (/^Error: WLS_SYNTHETIC_BOOTSTRAP_FAILURE$/m.test(scanned)) {
    markers.add("synthetic fatal bootstrap error");
  }
  if (/^WLS collection error:/m.test(scanned)) markers.add("CLI command rejection");
  if (/^Usage:$/m.test(scanned)) markers.add("CLI usage");
  for (const match of scanned.matchAll(
    /^(Error|TypeError|SyntaxError|ReferenceError|RangeError)(?: \[([A-Z_]{1,64})\])?:/gm,
  )) {
    const code = [
      "ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT",
      "ERR_UNKNOWN_FILE_EXTENSION", "ERR_REQUIRE_ESM", "ERR_INVALID_ARG_TYPE",
      "ERR_INVALID_ARG_VALUE", "ERR_INTERNAL_ASSERTION",
    ].includes(match[2]) ? match[2] : undefined;
    markers.add(`${match[1]}${code ? ` [${code}]` : ""}`);
  }
  const spawnCode = child.error && "code" in child.error ? child.error.code : undefined;
  const safeSpawnCode = ["ENOENT", "EACCES", "ETIMEDOUT", "ENOBUFS", "E2BIG"].includes(String(spawnCode))
    ? spawnCode : "unclassified";
  return [
    "Guarded child diagnostics",
    `status: ${child.status}; signal: ${child.signal ?? "none"}`,
    `spawn-error: ${child.error ? safeSpawnCode : "none"} (message/arguments omitted)`,
    `child stderr (safe summary; ${stderr.length} characters): ${
      !stderr ? "<empty>" : [...markers].join("; ") || "<unrecognised text omitted>"
    }${stderr.length > DIAGNOSTIC_SCAN_LIMIT ? " [scan truncated]" : ""}`,
  ].join("\n").slice(0, DIAGNOSTIC_LIMIT);
}

// The preload's loader transpiles TS without tsx's optional IPC connections.
// Do not inherit credentials, database settings, NODE_OPTIONS or startup hooks.
function guarded(args: string[], timeout = 10_000) {
  const child = spawnSync(process.execPath, [
    "--require", guard, ...args,
  ], {
    cwd: resolve("."),
    env: { PATH: process.env.PATH, TMPDIR: tmpdir(), NODE_ENV: "test", TZ: "UTC", NO_COLOR: "1" },
    encoding: "utf8", timeout, maxBuffer: 256_000,
    stdio: ["ignore", "pipe", "pipe", "pipe"],
  });
  let audit: unknown[];
  try {
    audit = String(child.output[3] ?? "").trim().split("\n").filter(Boolean)
      .map(line => JSON.parse(line));
  } catch {
    throw new Error(`Invalid child lifecycle audit\n${childDiagnostics(child)}`);
  }
  return { child, audit };
}

function assertGuarded({ child, audit }: ReturnType<typeof guarded>, status: number) {
  const violations = audit.filter(record =>
    record !== null && typeof record === "object" && "violation" in record).length;
  const undrained = audit.filter(record =>
    record !== null && typeof record === "object" && "drained" in record && record.drained === false).length;
  const diagnostics = `${childDiagnostics(child)}\nlifecycle audit: ${audit.length} records; violations: ${violations}; undrained exits: ${undrained}`;
  // Do not let assertion diffs print the raw spawn error (which contains argv).
  expect(child.error === undefined, diagnostics).toBe(true);
  expect(child.signal, diagnostics).toBeNull();
  expect(child.status, diagnostics).toBe(status);
  if (status === 0) expect(child.stderr === "", diagnostics).toBe(true);
  // An exact audit also catches swallowed attempts and premature process.exit().
  expect(audit, diagnostics).toEqual([{ ready: true }, { exit: status, drained: true }]);
  return child;
}

function run(args: string[], status: number) {
  return assertGuarded(guarded([cli, ...args]), status);
}

let root: string, manifest: string, lock: string, inputs: string, suite: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "wls-package-isolation-"));
  manifest = join(root, "manifest.json");
  lock = join(root, "lock.json");
  inputs = join(root, "inputs.json");
  suite = join(root, "suite.json");
  await writeFile(manifest, JSON.stringify({
    profile: "WLS-PACKAGE/1", name: "synthetic.isolation", version: "0.1.0",
    executionProfile: "WLS-COLLECTION/1", dependencies: { "wls.collections": "0.1.0" },
    programs: ["string.contains"],
  }));
  await writeFile(inputs, JSON.stringify({ items: ["synthetic"], value: "synthetic" }));
  await writeFile(suite, JSON.stringify({
    profile: "WLS-TEST/1", cases: [{
      name: "synthetic", program: "string.contains",
      inputs: { items: ["synthetic"], value: "synthetic" }, expect: { value: true },
    }],
  }));
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("package CLI stays local in real subprocesses", () => {
  it("checks, compiles, runs, locks and tests map programs without sockets or application startup", async () => {
    await writeFile(manifest, await readFile("scripts/fixtures/wls-map-package-v0-3.json"));
    await writeFile(suite, await readFile("scripts/fixtures/wls-map-v0-3-smoke.json"));
    await writeFile(inputs, JSON.stringify({ map: { entries: [["__proto__", "Ψ🙂"]] }, key: "__proto__" }));
    const source = resolve("shared/wls-library/map/get.wls");
    expect(JSON.parse(run(["compile", source], 0).stdout).profile).toBe("WLS-MAP/1");
    expect(JSON.parse(run(["run", source, inputs, "--trace"], 0).stdout)).toMatchObject({ value: "Ψ🙂", trace: expect.any(Array) });
    expect(JSON.parse(run(["package-check", manifest], 0).stdout).dependencies[0].version).toBe("0.3.0");
    const created = run(["package-lock", manifest], 0);
    await writeFile(lock, created.stdout);
    expect(JSON.parse(run(["package-verify", manifest, lock], 0).stdout).verified).toBe(true);
    for (const trace of [[], ["--trace"]]) {
      expect(JSON.parse(run(["package-run", manifest, "map.get", inputs, ...trace], 0).stdout).value).toBe("Ψ🙂");
      expect(JSON.parse(run(["package-run-locked", manifest, lock, "map.get", inputs, ...trace], 0).stdout))
        .toMatchObject({ profile: "WLS-MAP/1", integrity: "verified", value: "Ψ🙂" });
    }
    expect(JSON.parse(run(["test", suite], 0).stdout)).toMatchObject({ passed: 12, failed: 0 });
    expect(JSON.parse(run(["package-test-locked", manifest, lock, suite], 0).stdout))
      .toMatchObject({ passed: 12, failed: 0, integrity: "verified" });
    await writeFile(inputs, JSON.stringify({ map: { entries: [["a", "1"], ["a", "2"]] }, key: "a" }));
    expect(run(["package-run-locked", manifest, lock, "map.get", inputs, "--trace"], 1).stdout).toBe("");
  }, 45_000);

  it("checks and executes the new release under the same no-network and no-startup guard", async () => {
    const manifestText = await readFile(resolve("scripts/fixtures/wls-collection-package-v0-2.json"), "utf8");
    const suiteText = await readFile(resolve("scripts/fixtures/wls-library-v0-2-smoke.json"), "utf8");
    await writeFile(manifest, manifestText);
    await writeFile(suite, suiteText);
    const inputText = JSON.stringify({ items: ["a", "b", "a", "c"], value: "a" });
    await writeFile(inputs, inputText);
    expect(JSON.parse(run(["package-check", manifest], 0).stdout).dependencies[0].version).toBe("0.2.0");
    const created = run(["package-lock", manifest], 0);
    await writeFile(lock, created.stdout);
    expect(JSON.parse(run(["package-verify", manifest, lock], 0).stdout).verified).toBe(true);
    expect(JSON.parse(run(["package-run", manifest, "string.reverse", inputs], 0).stdout).value)
      .toEqual(["c", "a", "b", "a"]);
    expect(JSON.parse(run(["package-run-locked", manifest, lock, "string.lastIndexOf", inputs], 0).stdout).value).toBe(2);
    expect(JSON.parse(run(["package-test-locked", manifest, lock, suite], 0).stdout))
      .toMatchObject({ total: 6, passed: 6, failed: 0, integrity: "verified" });
    expect(await readFile(manifest, "utf8")).toBe(manifestText);
    expect(await readFile(suite, "utf8")).toBe(suiteText);
    expect(await readFile(inputs, "utf8")).toBe(inputText);
    expect(await readFile(lock, "utf8")).toBe(created.stdout);
  }, 30_000);

  it("checks, locks, verifies, runs and tests without sockets or startup imports", async () => {
    const original = await readFile(manifest, "utf8");
    expect(JSON.parse(run(["package-check", manifest], 0).stdout)).toMatchObject({ name: "synthetic.isolation" });
    const created = run(["package-lock", manifest], 0);
    expect(JSON.parse(created.stdout)).toMatchObject({ profile: "WLS-LOCK/1" });
    await writeFile(lock, created.stdout);
    expect(JSON.parse(run(["package-verify", manifest, lock], 0).stdout)).toMatchObject({ verified: true });
    for (const trace of [[], ["--trace"]]) {
      const result = run(["package-run", manifest, "string.contains", inputs, ...trace], 0);
      expect(JSON.parse(result.stdout)).toMatchObject({ value: true });
      const locked = run(["package-run-locked", manifest, lock, "string.contains", inputs, ...trace], 0);
      expect(JSON.parse(locked.stdout)).toMatchObject({ value: true, integrity: "verified" });
    }
    const tested = run(["package-test-locked", manifest, lock, suite], 0);
    expect(JSON.parse(tested.stdout)).toMatchObject({ total: 1, passed: 1, failed: 0, integrity: "verified" });
    expect(await readFile(manifest, "utf8")).toBe(original);
    expect(await readFile(lock, "utf8")).toBe(created.stdout);
  }, 30_000);

  it("rejects every package command without network or startup side effects", async () => {
    const created = run(["package-lock", manifest], 0);
    await writeFile(lock, created.stdout);
    const invalid = join(root, "invalid.json");
    await writeFile(invalid, "{");
    for (const [args, diagnostic] of [
      [["package-check", invalid], "valid JSON"],
      [["package-lock", invalid], "valid JSON"],
      [["package-run", manifest, "recipient.at", inputs], "not declared"],
      [["package-verify", manifest, invalid], "valid JSON"],
      [["package-run-locked", manifest, lock, "recipient.at", inputs], "not declared"],
      [["package-test-locked", manifest, lock, invalid], "valid JSON"],
      [["package-test-locked", manifest, lock, suite, "--relock"], "Usage:"],
    ] as const) {
      const rejected = run([...args], 1);
      expect(rejected.stdout).toBe("");
      expect(rejected.stderr).toContain(diagnostic);
      expect(rejected.stderr).not.toContain(root);
    }
    await writeFile(manifest, (await readFile(manifest, "utf8")) + "\n");
    for (const args of [
      ["package-verify", manifest, lock],
      ["package-run-locked", manifest, lock, "string.contains", inputs],
      ["package-test-locked", manifest, lock, suite],
    ]) expect(run(args, 1).stderr).toContain("Package integrity mismatch");
  }, 30_000);

  describe.each([
    ["package-check", "Package manifest", 1],
    ["package-lock", "Package manifest", 1],
    ["package-run", "Package manifest", 1],
    ["package-run", "Inputs", 3],
    ["package-verify", "Package manifest", 1],
    ["package-verify", "Lock", 2],
    ["package-run-locked", "Package manifest", 1],
    ["package-run-locked", "Lock", 2],
    ["package-run-locked", "Inputs", 4],
    ["package-test-locked", "Package manifest", 1],
    ["package-test-locked", "Lock", 2],
    ["package-test-locked", "Suite", 3],
  ] as const)("%s %s file rejection stays isolated", (command, label, position) => {
    async function validCommandArgs() {
      // Keep every prerequisite valid, including integrity and declaration
      // checks before inputs/suites, so the selected file read is reached.
      if (command === "package-verify" || command === "package-run-locked" || command === "package-test-locked") {
        await writeFile(lock, run(["package-lock", manifest], 0).stdout);
      }
      const commands: Record<typeof command, string[]> = {
        "package-check": ["package-check", manifest],
        "package-lock": ["package-lock", manifest],
        "package-run": ["package-run", manifest, "string.contains", inputs],
        "package-verify": ["package-verify", manifest, lock],
        "package-run-locked": ["package-run-locked", manifest, lock, "string.contains", inputs],
        "package-test-locked": ["package-test-locked", manifest, lock, suite],
      };
      return commands[command];
    }

    async function rejectFile(path: string, diagnostic: string, trace = false) {
      const args = await validCommandArgs();
      args[position] = path;
      if (trace) args.push("--trace");
      // run() requires a bounded, natural nonzero exit and exactly the
      // ready + drained-exit audit, with no swallowed isolation violations.
      const result = run(args, 1);
      // File rejection must not emit a result or even a partial trace.
      expect(result.stdout).toBe("");
      // Exact output excludes private paths/contents, OS errors and stacks.
      expect(result.stderr).toBe(`WLS collection error: ${diagnostic}\n`);
    }

    it.skipIf(process.platform === "win32")(
      "rejects a permission-denied regular file with a sanitized diagnostic", async ({ skip }) => {
        const args = await validCommandArgs();
        const path = args[position];
        const original = await readFile(path);
        const metadata = await stat(path);
        expect(metadata.isFile()).toBe(true);
        // A successful control proves prerequisites, paths and file contents
        // work before changing only the selected file's permissions.
        run(args, 0);
        try {
          await chmod(path, 0o000);
          // Probe an actual read in a child with the CLI's guard, environment
          // and credentials. chmod alone is not evidence of denial under root.
          const { child, audit } = guarded(["-e", `
            try {
              require('node:fs').readFileSync(process.argv[1]);
              console.log('readable');
            } catch (error) {
              console.log(error.code);
            }
          `, path]);
          expect(child.error).toBeUndefined();
          expect(child.signal).toBeNull();
          expect(child.status, child.stderr).toBe(0);
          expect(child.stderr).toBe("");
          expect(audit).toEqual([{ ready: true }, { exit: 0, drained: true }]);
          if (child.stdout === "readable\n" && process.geteuid?.() === 0) {
            skip("Root bypasses file read permissions on this filesystem.");
          }
          expect(child.stdout).toBe("EACCES\n");
          const result = run(args, 1);
          expect(result.stdout).toBe("");
          // Exact output excludes file contents, paths, EACCES details/stacks.
          expect(result.stderr).toBe(`WLS collection error: Cannot read ${label.toLowerCase()} file.\n`);
        } finally {
          // Restore even after assertions fail or the root control skips.
          await chmod(path, metadata.mode & 0o7777);
        }
        expect(await readFile(path)).toEqual(original);
      }, 30_000,
    );

    it.each([0, 1])(
      "preserves a UTF-8 BOM at character limit + %i without services", async excess => {
        const needsLock = command === "package-verify" || command === "package-run-locked" || command === "package-test-locked";
        const args = await validCommandArgs();
        const characterLimit = label === "Package manifest" ? COLLECTION_PACKAGE_TEXT_LIMIT
          : label === "Lock" ? COLLECTION_LOCK_TEXT_LIMIT
          : label === "Inputs" ? COLLECTION_CLI_INPUT_LIMIT : COLLECTION_TEST_LIMITS.text;
        const selected = args[position];
        // The body alone fits. Only the preserved BOM makes excess=1 too large.
        const body = (await readFile(selected, "utf8")).padEnd(characterLimit - 1 + excess, " ");
        const text = "\uFEFF" + body;
        const bytes = Buffer.from(text, "utf8");
        expect(body.length).toBeLessThanOrEqual(characterLimit);
        expect(text.length).toBe(characterLimit + excess);
        expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
        expect(bytes.length).toBeLessThanOrEqual(characterLimit * 4);
        await writeFile(selected, bytes);
        const paths = [manifest, inputs, suite, ...(needsLock ? [lock] : [])];
        const originals = await Promise.all(paths.map(path => readFile(path)));
        // At the boundary JSON must see (and reject) the BOM. One character
        // above it, the reader must reject size before any JSON/integrity check.
        const diagnostic = excess ? `${label} exceeds its size limit.` : `${label} must contain valid JSON.`;
        const result = run(args, 1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe(`WLS collection error: ${diagnostic}\n`);
        expect(await Promise.all(paths.map(path => readFile(path)))).toEqual(originals);
      }, 30_000,
    );
    it.each(["missing file", "directory", "invalid UTF-8"])(
      "rejects %s with a sanitized diagnostic", async kind => {
        const path = join(root, "synthetic-private-file");
        const bytes = Buffer.concat([Buffer.from("synthetic-private-contents"), Buffer.from([0xff])]);
        let diagnostic: string;
        if (kind === "missing file") {
          diagnostic = `Cannot read ${label.toLowerCase()} file.`;
        } else if (kind === "directory") {
          await mkdir(path);
          diagnostic = `${label} must be a regular file.`;
        } else {
          await writeFile(path, bytes);
          diagnostic = `${label} must contain valid UTF-8.`;
        }
        await rejectFile(path, diagnostic);
        if (kind === "invalid UTF-8") expect(await readFile(path)).toEqual(bytes);
      }, 30_000,
    );

    it.skipIf(process.platform === "win32").each(
      command === "package-run" || command === "package-run-locked" ? [false, true] : [false],
    )(
      "rejects a named pipe without waiting for a writer with trace=%s", async trace => {
        const pipe = join(root, "synthetic-private-pipe");
        execFileSync("mkfifo", [pipe], { timeout: 5_000 });
        // Never open a writer: a blocking read must fail the subprocess bound,
        // not pass because a helper happened to unblock the pipe.
        await rejectFile(pipe, `${label} must be a regular file.`, trace);
      }, 30_000,
    );

    it.skipIf(process.platform === "win32")(
      "rejects a symbolic link to a named pipe without waiting for a writer", async () => {
        const pipe = join(root, "synthetic-private-pipe-target");
        const link = join(root, "synthetic-private-pipe-link");
        execFileSync("mkfifo", [pipe], { timeout: 5_000 });
        await symlink(pipe, link);
        // Select only the link, so the regular-file check must inspect its
        // resolved target. No writer may unblock an accidentally blocking read.
        await rejectFile(link, `${label} must be a regular file.`);
      }, 30_000,
    );
  });

  it("exits naturally when a locked suite has an assertion failure", async () => {
    await writeFile(lock, run(["package-lock", manifest], 0).stdout);
    const text = (await readFile(suite, "utf8")).replace('"value":true', '"value":false');
    await writeFile(suite, text);
    const result = run(["package-test-locked", manifest, lock, suite], 1);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ failed: 1, results: [{ reason: "value-mismatch" }] });
  });

  describe.each([
    ["package-check", "manifest"],
    ["package-lock", "manifest"],
    ["package-run", "manifest"],
    ["package-verify", "manifest"],
    ["package-run-locked", "manifest"],
    ["package-test-locked", "manifest"],
    ["package-verify", "lock"],
    ["package-run-locked", "lock"],
    ["package-test-locked", "lock"],
  ] as const)("%s rejects oversized %s offline", (command, target) => {
    it.each(["bytes", "characters"] as const)(
      "rejects one unit over the %s limit without modifying fixtures", async kind => {
        await writeFile(lock, run(["package-lock", manifest], 0).stdout);
        const characterLimit = target === "manifest" ? COLLECTION_PACKAGE_TEXT_LIMIT : COLLECTION_LOCK_TEXT_LIMIT;
        const label = target === "manifest" ? "Package manifest" : "Lock";
        const selected = target === "manifest" ? manifest : lock;
        const path = join(root, `synthetic-private-oversized-${target}-${kind}`);
        const original = await readFile(selected, "utf8");
        let oversized: Buffer;
        if (kind === "bytes") {
          // Invalid UTF-8 distinguishes the byte guard from later decoding and
          // character checks: removing it must not produce the same diagnostic.
          oversized = Buffer.alloc(characterLimit * 4 + 1, 0xff);
          expect(oversized.length).toBe(characterLimit * 4 + 1);
        } else {
          // Valid JSON with ASCII whitespace crosses only the character bound.
          // For a manifest the lock still hashes the original: size rejection
          // must happen before integrity checks or any program/suite execution.
          const text = original.padEnd(characterLimit + 1, " ");
          expect(text.length).toBe(characterLimit + 1);
          expect(JSON.parse(text)).toEqual(JSON.parse(original));
          oversized = Buffer.from(text, "utf8");
          expect(oversized.length).toBeLessThanOrEqual(characterLimit * 4);
        }
        await writeFile(path, oversized);
        const selectedManifest = target === "manifest" ? path : manifest;
        const selectedLock = target === "lock" ? path : lock;
        const args = [command, selectedManifest];
        if (command === "package-verify" || command.endsWith("-locked")) args.push(selectedLock);
        if (command === "package-run" || command === "package-run-locked") args.push("string.contains", inputs);
        if (command === "package-test-locked") args.push(suite);

        const paths = [manifest, lock, inputs, suite, path];
        const before = await Promise.all(paths.map(file => readFile(file)));
        const entries = (await readdir(root)).sort();
        // run() bounds the subprocess and requires a naturally drained nonzero
        // exit with exactly the guard's ready/exit records and zero violations.
        const result = run(args, 1);
        expect(result.stdout).toBe("");
        // Exact output excludes paths, private contents, stacks and OS errors.
        expect(result.stderr).toBe(`WLS collection error: ${label} exceeds its size limit.\n`);
        expect(await Promise.all(paths.map(file => readFile(file)))).toEqual(before);
        expect((await readdir(root)).sort()).toEqual(entries);
      }, 15_000,
    );
  });
});

describe("standalone collection CLI stays local in real subprocesses", () => {
  const source = `WLS-COLLECTION/1
LIST_LEN ["size","items"]
RETURN ["size"]`;
  let program: string;
  beforeEach(async () => {
    program = join(root, "program.wls");
    await writeFile(program, source);
  });

  it("compiles synthetic source without sockets or startup imports", async () => {
    const result = run(["compile", program], 0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      profile: "WLS-COLLECTION/1",
      instructions: [{ op: "LIST_LEN", line: 2 }, { op: "RETURN", line: 3 }],
    });
    expect(await readFile(program, "utf8")).toBe(source);
  });

  it.each([false, true])("runs synthetic inputs offline with trace=%s", async trace => {
    const originalInputs = await readFile(inputs, "utf8");
    const result = run(["run", program, inputs, ...(trace ? ["--trace"] : [])], 0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({ profile: "WLS-COLLECTION/1", value: 1, cycles: 2 });
    if (trace) {
      expect(output.trace).toEqual([
        expect.objectContaining({ op: "LIST_LEN" }),
        expect.objectContaining({ op: "RETURN" }),
      ]);
    } else {
      expect(output).not.toHaveProperty("trace");
    }
    expect(await readFile(program, "utf8")).toBe(source);
    expect(await readFile(inputs, "utf8")).toBe(originalInputs);
  });

  it("stops a runaway standalone program at the VM cycle limit without services", async () => {
    await writeFile(program, 'WLS-COLLECTION/1\n:loop\nJUMP ["loop"]\nRETURN ["unused"]');
    // run() enforces the subprocess timeout, natural exit and exact clean audit:
    // even caught socket/startup-import attempts or process.exit(1) fail it.
    const result = run(["run", program, inputs], 1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("cycle limit");
    expect(result.stderr).not.toContain(root);
  }, 15_000);

  it("tests a synthetic suite offline and leaves it unchanged", async () => {
    const original = await readFile(suite, "utf8");
    const result = run(["test", suite], 0);
    expect(JSON.parse(result.stdout)).toEqual({
      profile: "WLS-TEST/1", total: 1, passed: 1, failed: 0,
      results: [{
        name: "synthetic", program: "string.contains", passed: true, reason: "matched-value",
      }],
    });
    expect(await readFile(suite, "utf8")).toBe(original);
  });

  it.each([
    ["compile", "foreign source", "console.log('synthetic')", "Unsupported collection source version"],
    ["run", "malformed JSON", "{", "Inputs must contain valid JSON"],
    ["run", "non-object inputs", "[]", "Inputs must be a non-null JSON object"],
    ["run", "invalid collection items", '{"items":[1]}', "Invalid collection item"],
    ["test", "malformed JSON", "{", "Suite must contain valid JSON"],
    ["test", "invalid suite", '{"profile":"WLS-TEST/1","cases":[]}', "Suite must contain between 1 and 64 cases"],
  ])("rejects %s with %s without isolation violations", async (command, _label, text, diagnostic) => {
    const selected = command === "compile" ? program : command === "run" ? inputs : suite;
    await writeFile(selected, text);
    const args = command === "run" ? [command, program, inputs] : [command, selected];
    const result = run(args, 1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
    expect(result.stderr).not.toContain(root);
    expect(await readFile(selected, "utf8")).toBe(text);
  });

  it.each(["compile", "run", "test"])("rejects unsupported %s arguments offline", command => {
    const args = command === "run" ? [command, program, inputs] : [command, program];
    const result = run([...args, "--unsafe"], 1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Usage:");
    expect(result.stderr).not.toContain(root);
  });

  it.each([
    ["compile source", COLLECTION_LIMITS.sourceLength],
    ["run source", COLLECTION_LIMITS.sourceLength],
    ["run inputs", COLLECTION_CLI_INPUT_LIMIT],
    ["test suite", COLLECTION_TEST_LIMITS.text],
  ] as const)("accepts valid multibyte %s at its character limit offline", async (target, characterLimit) => {
    const multibyteInputs = JSON.stringify({ items: ["Ψ🌊"], value: "Ψ🌊" });
    const multibyteSuite = JSON.stringify({
      profile: "WLS-TEST/1", cases: [{
        name: "synthetic boundary", program: "string.contains",
        inputs: { items: ["Ψ🌊"], value: "Ψ🌊" }, expect: { value: true },
      }],
    });
    const selected = target.endsWith("source") ? program : target === "run inputs" ? inputs : suite;
    const text = target.endsWith("source")
      ? source + "\n//" + "é".repeat(characterLimit - source.length - 3)
      : (target === "run inputs" ? multibyteInputs : multibyteSuite).padEnd(characterLimit, " ");
    expect(text.length).toBe(characterLimit);
    // These must exercise character acceptance, not an ASCII-only byte boundary.
    expect(Buffer.byteLength(text, "utf8")).toBeGreaterThan(characterLimit);
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(characterLimit * 4);
    await writeFile(inputs, multibyteInputs);
    await writeFile(suite, multibyteSuite);
    await writeFile(selected, text);
    const paths = [program, inputs, suite];
    const originals = await Promise.all(paths.map(path => readFile(path)));
    const args = target === "compile source" ? ["compile", program]
      : target === "test suite" ? ["test", suite]
      : ["run", program, inputs];
    // The same strict guard checks timeout/signal errors, empty stderr, natural
    // draining and the exact clean audit, including any swallowed violations.
    const output = JSON.parse(run(args, 0).stdout);
    if (target === "compile source") {
      expect(output).toMatchObject({
        profile: "WLS-COLLECTION/1",
        instructions: [{ op: "LIST_LEN", line: 2 }, { op: "RETURN", line: 3 }],
      });
    } else if (target === "test suite") {
      expect(output).toEqual({
        profile: "WLS-TEST/1", total: 1, passed: 1, failed: 0,
        results: [{
          name: "synthetic boundary", program: "string.contains", passed: true, reason: "matched-value",
        }],
      });
    } else {
      expect(output).toEqual({ profile: "WLS-COLLECTION/1", value: 1, cycles: 2 });
    }
    expect(await Promise.all(paths.map(path => readFile(path)))).toEqual(originals);
  }, 15_000);

  describe.each([
    ["compile source", "Source", COLLECTION_LIMITS.sourceLength],
    ["run source", "Source", COLLECTION_LIMITS.sourceLength],
    ["run inputs", "Inputs", COLLECTION_CLI_INPUT_LIMIT],
    ["test suite", "Suite", COLLECTION_TEST_LIMITS.text],
  ] as const)("%s file rejection stays isolated", (target, label, characterLimit) => {
    function rejectFile(path: string, diagnostic: string) {
      const args = target === "compile source" ? ["compile", path]
        : target === "run source" ? ["run", path, inputs]
        : target === "run inputs" ? ["run", program, path]
        : ["test", path];
      // run() bounds the child, rejects timeout/signal exits, and requires the
      // exact ready + naturally drained exit audit with no caught violations.
      const result = run(args, 1);
      expect(result.stdout).toBe("");
      // Exact output excludes paths, fixture contents, stacks and OS errors.
      expect(result.stderr).toBe(`WLS collection error: ${diagnostic}\n`);
    }

    it.each([0, 1])(
      "preserves a UTF-8 BOM at character limit + %i without services", async excess => {
        const selected = label === "Source" ? program : label === "Inputs" ? inputs : suite;
        const body = (await readFile(selected, "utf8")).padEnd(characterLimit - 1 + excess, " ");
        const text = "\uFEFF" + body;
        const bytes = Buffer.from(text, "utf8");
        expect(body.length).toBeLessThanOrEqual(characterLimit);
        expect(text.length).toBe(characterLimit + excess);
        expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
        expect(bytes.length).toBeLessThanOrEqual(characterLimit * 4);
        await writeFile(selected, bytes);
        const paths = [program, inputs, suite];
        const originals = await Promise.all(paths.map(path => readFile(path)));
        if (excess) {
          rejectFile(selected, `${label} exceeds its size limit.`);
        } else if (label !== "Source") {
          rejectFile(selected, `${label} must contain valid JSON.`);
        } else {
          // Source policy trims the profile line, so an in-bound BOM is valid.
          const args = target === "compile source" ? ["compile", program] : ["run", program, inputs];
          const output = JSON.parse(run(args, 0).stdout);
          if (target === "compile source") {
            expect(output).toMatchObject({
              profile: "WLS-COLLECTION/1",
              instructions: [
                { op: "LIST_LEN", args: ["size", "items"], line: 2 },
                { op: "RETURN", args: ["size"], line: 3 },
              ],
            });
          } else {
            expect(output).toEqual({ profile: "WLS-COLLECTION/1", value: 1, cycles: 2 });
          }
        }
        expect(await Promise.all(paths.map(path => readFile(path)))).toEqual(originals);
      }, 15_000,
    );

    it("rejects a file one byte over the byte limit without services", async () => {
      const path = join(root, "synthetic-private-oversized-bytes");
      // Invalid UTF-8 makes the size diagnostic prove rejection before decoding,
      // rather than letting the later character-limit check mask a byte-check bug.
      const bytes = Buffer.alloc(characterLimit * 4 + 1, 0xff);
      expect(bytes.length).toBe(characterLimit * 4 + 1);
      await writeFile(path, bytes);
      rejectFile(path, `${label} exceeds its size limit.`);
      expect(await readFile(path)).toEqual(bytes);
    }, 15_000);

    it("rejects a file one character over the character limit without services", async () => {
      const path = join(root, "synthetic-private-oversized-characters");
      const selected = label === "Source" ? program : label === "Inputs" ? inputs : suite;
      // Otherwise-valid source/JSON with ASCII whitespace exceeds only the
      // character bound, not the larger UTF-8 byte bound.
      const text = (await readFile(selected, "utf8")).padEnd(characterLimit + 1, " ");
      expect(text.length).toBe(characterLimit + 1);
      expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(characterLimit * 4);
      await writeFile(path, text);
      rejectFile(path, `${label} exceeds its size limit.`);
      expect(await readFile(path, "utf8")).toBe(text);
    }, 15_000);

    it.each(["missing file", "directory", "invalid UTF-8"])(
      "rejects %s with a sanitized diagnostic", async kind => {
        const path = join(root, "synthetic-private-file");
        if (kind === "missing file") {
          rejectFile(path, `Cannot read ${label.toLowerCase()} file.`);
        } else if (kind === "directory") {
          await mkdir(path);
          rejectFile(path, `${label} must be a regular file.`);
        } else {
          const bytes = Buffer.concat([Buffer.from("synthetic-private-contents"), Buffer.from([0xff])]);
          await writeFile(path, bytes);
          rejectFile(path, `${label} must contain valid UTF-8.`);
          expect(await readFile(path)).toEqual(bytes);
        }
      }, 15_000,
    );

    it.each([
      ["two-byte sequence missing one byte", [0xc2]],
      ["three-byte sequence missing two bytes", [0xe2]],
      ["three-byte sequence missing one byte", [0xe2, 0x82]],
      ["four-byte sequence missing three bytes", [0xf0]],
      ["four-byte sequence missing two bytes", [0xf0, 0x9f]],
      ["four-byte sequence missing one byte", [0xf0, 0x9f, 0x92]],
    ] as const)("rejects a truncated %s offline without changing bytes", async (_name, suffix) => {
      const path = join(root, "synthetic-private-truncated-utf8");
      const selected = label === "Source" ? program : label === "Inputs" ? inputs : suite;
      // Keep the synthetic document valid up to EOF, where decoding must reject
      // an unfinished character rather than insert U+FFFD and continue parsing.
      const bytes = Buffer.concat([await readFile(selected), Buffer.from(suffix)]);
      await writeFile(path, bytes);
      rejectFile(path, `${label} must contain valid UTF-8.`);
      expect(await readFile(path)).toEqual(bytes);
    }, 15_000);

    it.skipIf(process.platform === "win32")(
      "rejects a named pipe without waiting for a writer", () => {
        const pipe = join(root, "synthetic-private-pipe");
        execFileSync("mkfifo", [pipe], { timeout: 5_000 });
        // Never open a writer: a blocking read must fail the subprocess bound,
        // not pass because a helper happened to unblock the pipe.
        rejectFile(pipe, `${label} must be a regular file.`);
      }, 20_000,
    );
  });

  it("exits naturally and reports a failing standalone assertion offline", async () => {
    const failing = JSON.parse(await readFile(suite, "utf8"));
    failing.cases[0].expect.value = false;
    const text = JSON.stringify(failing);
    await writeFile(suite, text);
    const result = run(["test", suite], 1);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      profile: "WLS-TEST/1", total: 1, passed: 0, failed: 1,
      results: [{
        name: "synthetic", program: "string.contains", passed: false, reason: "value-mismatch",
      }],
    });
    expect(await readFile(suite, "utf8")).toBe(text);
  });
});

describe("bounded isolation failure diagnostics", () => {
  function failure(result: ReturnType<typeof guarded>, status: number): string {
    try {
      assertGuarded(result, status);
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error("Synthetic control unexpectedly passed");
  }

  it("distinguishes fatal bootstrap failure from a naturally drained command rejection", () => {
    const rejected = guarded([cli, "synthetic-invalid-command"]);
    assertGuarded(rejected, 1);
    expect(rejected.audit).toEqual([{ ready: true }, { exit: 1, drained: true }]);
    const rejectionReport = failure(rejected, 0);
    expect(rejectionReport).toContain("child stderr (safe summary;");
    expect(rejectionReport).toContain("CLI command rejection");
    expect(rejectionReport).toContain("spawn-error: none");
    expect(rejectionReport).not.toContain("synthetic fatal bootstrap error");

    const fatal = guarded([resolve("scripts/fixtures/wls-cli-isolation-bootstrap-failure.cjs")]);
    expect(fatal.child.status).toBe(1);
    expect(fatal.audit).toEqual([{ ready: true }, { exit: 1, drained: false }]);
    const fatalReport = failure(fatal, 1);
    expect(fatalReport).toContain("synthetic fatal bootstrap error");
    expect(fatalReport).toContain("spawn-error: none");
    expect(fatalReport).toContain("undrained exits: 1");
    expect(fatalReport).not.toContain("CLI command rejection");
  });

  it.each(["rejection", "bootstrap"])("does not hide swallowed guard violations during %s", layer => {
    // Entry code, not another preload: Node replays preloads in its internal
    // loader worker, before the main-thread guard has finished registering.
    const result = guarded(["-e", `
      try { require('pg'); } catch {}
      ${layer === "bootstrap"
        ? `require(${JSON.stringify(resolve("scripts/fixtures/wls-cli-isolation-bootstrap-failure.cjs"))});`
        : `process.argv = [process.execPath, ${JSON.stringify(cli)}, 'synthetic-invalid-command'];
           import(require('node:url').pathToFileURL(${JSON.stringify(cli)}).href);`}
    `]);
    expect(result.child.error).toBeUndefined();
    expect(result.child.signal).toBeNull();
    expect(result.child.status).toBe(1);
    expect(result.audit).toEqual([
      { ready: true }, { violation: "startup import" }, { exit: 1, drained: layer === "rejection" },
    ]);
    const report = failure(result, 1);
    expect(report).toContain("violations: 1");
    expect(report).toContain(layer === "bootstrap" ? "synthetic fatal bootstrap error" : "CLI command rejection");
  });

  it("reports a real local spawn failure without echoing its arguments", () => {
    const child = spawnSync(join(root, "missing-synthetic-node"), ["SYNTHETIC_PRIVATE_ARGUMENT"], {
      env: {}, encoding: "utf8",
    });
    expect(child.error).toMatchObject({ code: "ENOENT" });
    const report = failure({ child, audit: [] }, 1);
    expect(report).toContain("spawn-error: ENOENT");
    expect(report).toContain("child stderr (safe summary; 0 characters): <empty>");
    expect(report).not.toContain("SYNTHETIC_PRIVATE_ARGUMENT");
    expect(report).not.toContain(root);
  });

  it("attaches diagnostics to a signal failure", () => {
    const result = guarded(["-e", "process.kill(process.pid, 'SIGTERM')"]);
    expect(result.child.signal).toBe("SIGTERM");
    expect(result.audit).toEqual([{ ready: true }]);
    const report = failure(result, 0);
    expect(report).toContain("signal: SIGTERM");
    expect(report).toContain("spawn-error: none");
    expect(report).toContain("child stderr");
  });

  it("bounds diagnostics and omits synthetic private text, paths, source and stdout", () => {
    const result = guarded(["-e", ""]);
    const privateText = "SYNTHETIC_PRIVATE_INPUT";
    const child = {
      ...result.child,
      stdout: privateText,
      stderr: `Error [ERR_MODULE_NOT_FOUND]: ${privateText} ${root}\n` +
        `throw new Error('${privateText}');\n` + "x".repeat(20_000),
    };
    const diagnostics = childDiagnostics(child);
    expect(diagnostics.length).toBeLessThanOrEqual(DIAGNOSTIC_LIMIT);
    expect(diagnostics).toContain("Error [ERR_MODULE_NOT_FOUND]");
    expect(diagnostics).toContain("[scan truncated]");
    const report = failure({ child, audit: [{ ready: true }, { exit: 0, drained: false }] }, 0);
    expect(report).toContain(diagnostics);
    expect(report).not.toContain(privateText);
    expect(report).not.toContain(root);
    expect(report).not.toContain("throw new Error");
  });
});

describe("isolation guard detects attempts before effects, including caught errors", () => {
  describe.each(["CommonJS", "ESM"])("%s loader registration", format => {
    it.for(["register", "registerHooks"] as const)(
      "audits swallowed module.%s without running application loader code",
      async (method, { skip }) => {
        // registerHooks is only available on newer Node releases.
        if (!(method in nodeModule)) skip();
        const marker = join(root, "loader-executed");
        const loader = join(root, "helper-loader.mjs");
        const payload = `writeFileSync(${JSON.stringify(marker)}, 'executed');`;
        await writeFile(loader, `
          import { writeFileSync } from 'node:fs';
          ${payload}
          export function resolve(specifier, context, nextResolve) {
            return nextResolve(specifier, context);
          }
        `);
        const imports = format === "CommonJS"
          ? `const { ${method} } = require('node:module');
             const { writeFileSync } = require('node:fs');
             const { pathToFileURL } = require('node:url');`
          : `import { ${method} } from 'node:module';
             import { writeFileSync } from 'node:fs';
             import { pathToFileURL } from 'node:url';`;
        const attempt = method === "register"
          ? `register(pathToFileURL(${JSON.stringify(loader)}));`
          : `registerHooks({ resolve(specifier, context, nextResolve) {
              ${payload}
              return nextResolve(specifier, context);
            } });`;
        const args = [
          ...(format === "ESM" ? ["--input-type=module"] : []), "-e", `
            ${imports}
            (async () => {
              try { ${attempt} } catch {}
              // Exercise hooks as well as registration; no services or helpers.
              await import('data:text/javascript,export default 1');
            })().catch(() => { process.exitCode = 1; });
          `,
        ];
        // A positive control proves the synthetic loader really runs without
        // the guard, so an absent marker is meaningful rather than a bad fixture.
        const control = spawnSync(process.execPath, args, {
          env: { NODE_ENV: "test" }, encoding: "utf8", timeout: 10_000,
        });
        expect(control.error).toBeUndefined();
        expect(control.signal).toBeNull();
        expect(control.status, control.stderr).toBe(0);
        expect(await readFile(marker, "utf8")).toBe("executed");
        await rm(marker);

        const { child, audit } = guarded(args);
        expect(child.error).toBeUndefined();
        expect(child.signal).toBeNull();
        expect(child.status, child.stderr).toBe(0);
        expect(child.stderr).toBe("");
        expect(audit).toEqual([
          { ready: true }, { violation: `module.${method}` }, { exit: 0, drained: true },
        ]);
        await expect(readFile(marker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      },
    );
  });

  // Helpers deliberately only write a marker: even a broken guard must not
  // contact a real service. A missing marker proves the helper never executed.
  const helperAttempts = [
    ["child_process.spawn", "cp.spawn(process.execPath, [helper], options)"],
    ["child_process.spawnSync", "cp.spawnSync(process.execPath, [helper], options)"],
    ["child_process.exec", "cp.exec(command, options)"],
    ["child_process.execSync", "cp.execSync(command, options)"],
    ["child_process.execFile", "cp.execFile(process.execPath, [helper], options)"],
    ["child_process.execFileSync", "cp.execFileSync(process.execPath, [helper], options)"],
    ["child_process.fork", "cp.fork(helper, [], { ...options, execArgv: [] })"],
    ["child_process.ChildProcess.spawn", `new cp.ChildProcess().spawn({
      file: process.execPath, args: [process.execPath, helper], envPairs: [],
      stdio: ['ignore', 'ignore', 'ignore'], detached: false
    })`],
    // Cluster launches are caught at child_process.fork on this runtime.
    ["child_process.fork", `cluster.setupPrimary({
      exec: helper, args: [], execArgv: [], silent: true
    }); cluster.fork({ NODE_OPTIONS: '' })`],
    ["worker_threads.Worker", "new Worker(helper, { execArgv: [] })"],
    ["worker_threads.Worker", "new Worker(payload, { eval: true, execArgv: [] })"],
  ];
  describe.each(["CommonJS", "ESM"])("%s helper launches", format => {
    it.each(helperAttempts)("audits swallowed %s without executing a helper", async (violation, attempt) => {
      const marker = join(root, "helper-executed");
      const helper = join(root, "helper.cjs");
      const payload = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed');`;
      await writeFile(helper, payload);
      const imports = format === "CommonJS"
        ? "const cp = require('node:child_process'); const { Worker } = require('node:worker_threads'); const cluster = require('node:cluster');"
        : `import * as cp from 'node:child_process'; import { Worker } from 'node:worker_threads'; import cluster from 'node:cluster';`;
      const code = `
        ${imports}
        const helper = ${JSON.stringify(helper)};
        const payload = ${JSON.stringify(payload)};
        const command = ${JSON.stringify(`${JSON.stringify(process.execPath)} ${JSON.stringify(helper)}`)};
        // Clear inherited preloads so an accidentally launched helper cannot
        // appear safe merely because it inherited the same guard.
        const options = { env: {}, stdio: 'ignore' };
        try { ${attempt}; } catch {}
      `;
      const { child, audit } = guarded([
        ...(format === "ESM" ? ["--input-type=module"] : []), "-e", code,
      ]);
      expect(child.error).toBeUndefined();
      expect(child.signal).toBeNull();
      expect(child.status, child.stderr).toBe(0);
      expect(child.stderr).toBe("");
      expect(audit).toEqual([{ ready: true }, { violation }, { exit: 0, drained: true }]);
      await expect(readFile(marker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it.each([
    ["fetch", "fetch('https://synthetic.invalid/')"],
    ["http.request", "require('node:http').request('http://synthetic.invalid/')"],
    ["https.get", "require('node:https').get('https://synthetic.invalid/')"],
    ["net.connect", "require('node:net').connect(9, '192.0.2.1')"],
    ["net.Socket.connect", "new (require('node:net').Socket)().connect(9, '192.0.2.1')"],
    ["tls.connect", "require('node:tls').connect(443, 'synthetic.invalid')"],
    ["net.Server.listen", "require('node:http').createServer().listen(0)"],
    ["net.Server.listen", "require('node:net').createServer().listen('/tmp/synthetic-wls.sock')"],
    ["dgram.createSocket", "require('node:dgram').createSocket('udp4')"],
    ["dns.lookup", "require('node:dns').lookup('synthetic.invalid', () => {})"],
    ["dns.promises.resolve4", "require('node:dns').promises.resolve4('synthetic.invalid')"],
    ["startup import", "require('pg')"],
    ["startup import", "require('./server/db.ts')"],
    ["startup import", "require('./server/index.ts')"],
    ["startup import", "require('./client/src/main.tsx')"],
  ])("records %s even when the caller swallows the error", (violation, code) => {
    const { child, audit } = guarded(["-e", `try { ${code}; } catch {} `]);
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(child.signal).toBeNull();
    expect(audit).toEqual([{ ready: true }, { violation }, { exit: 0, drained: true }]);
  });

  it("guards ESM named builtins and dynamic startup imports through the TS loader", () => {
    const code = `
      import { connect } from 'node:net';
      try { connect(9, '192.0.2.1'); } catch {}
      try { await import('./server/index.ts'); } catch {}
    `;
    const { child, audit } = guarded(["--input-type=module", "-e", code]);
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(audit).toEqual([
      { ready: true }, { violation: "net.connect" }, { violation: "startup import" },
      { exit: 0, drained: true },
    ]);
  });

  it("distinguishes forced exit from a normally drained event loop", () => {
    const { child, audit } = guarded(["-e", "process.exit(0)"]);
    expect(child.status).toBe(0);
    expect(audit).toEqual([{ ready: true }, { exit: 0, drained: false }]);
  });

  it("bounds a subprocess with a leaked service-like timer", () => {
    const { child, audit } = guarded(["-e", "setInterval(() => {}, 1000)"], 1000);
    expect(child.error).toMatchObject({ code: "ETIMEDOUT" });
    expect(child.signal).not.toBeNull();
    expect(audit).toEqual([{ ready: true }]);
  });
});
