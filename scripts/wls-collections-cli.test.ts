import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { COLLECTION_CLI_INPUT_LIMIT, runCollectionCommand } from "./wls-collections-cli";
import { COLLECTION_LIMITS } from "../shared/wls-collection-vm";

const source = `WLS-COLLECTION/1
LIST_LEN ["size","items"]
RETURN ["size"]`;
let root: string, program: string, input: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "wls-cli-"));
  program = join(root, "program.wls");
  input = join(root, "inputs.json");
  await writeFile(program, source);
  await writeFile(input, '{"items":["alpha","beta"]}');
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("bounded local WavelengthScript collection tool", () => {
  it("compiles source into coordinate-tagged instructions", async () => {
    const result = await runCollectionCommand(["compile", program]);
    expect(result).toMatchObject({
      profile: "WLS-COLLECTION/1",
      instructions: [{ op: "LIST_LEN", line: 2 }, { op: "RETURN", line: 3 }],
    });
    expect(JSON.stringify(result)).not.toContain(program);
  });

  it("runs with optional visited trace and leaves both files unchanged", async () => {
    expect(await runCollectionCommand(["run", program, input])).toEqual({
      profile: "WLS-COLLECTION/1", value: 2, cycles: 2,
    });
    expect(await runCollectionCommand(["run", program, input, "--trace"])).toMatchObject({
      value: 2, trace: [{ op: "LIST_LEN" }, { op: "RETURN" }],
    });
    expect(await readFile(program, "utf8")).toBe(source);
    expect(await readFile(input, "utf8")).toBe('{"items":["alpha","beta"]}');
  });

  it.each([[], ["unknown"], ["run"], ["compile", "a", "b"], ["run", "a", "b", "--unsafe"]].map(args => ({ args })))(
    "rejects unsupported command shape $args", async ({ args }) => {
      await expect(runCollectionCommand(args)).rejects.toThrow("Usage:");
    },
  );

  it("offers help without reading any file", async () => {
    expect(await runCollectionCommand(["--help"])).toMatchObject({ help: expect.stringContaining("Usage:") });
  });

  it("executes collection suites with passing and failing process exit codes", async () => {
    const cli = resolve("scripts/wls-collections-cli.ts");
    const executable = resolve("node_modules/.bin/tsx");
    const suiteFile = join(root, "suite.json");
    const manifest = { profile: "WLS-TEST/1", cases: [{
      name: "local count", program: "recipient.count", inputs: { items: [] }, expect: { value: 0 },
    }] };
    await writeFile(suiteFile, JSON.stringify(manifest));
    const options = { encoding: "utf8" as const, timeout: 10_000, maxBuffer: 256_000 };
    const success = spawnSync(executable, [cli, "test", suiteFile], options);
    expect(success.error).toBeUndefined();
    expect(success.status).toBe(0);
    expect(success.stderr).toBe("");
    expect(JSON.parse(success.stdout)).toMatchObject({ total: 1, passed: 1, failed: 0 });
    manifest.cases[0].expect.value = 1;
    await writeFile(suiteFile, JSON.stringify(manifest));
    const failure = spawnSync(executable, [cli, "test", suiteFile], options);
    expect(failure.error).toBeUndefined();
    expect(failure.status).toBe(1);
    expect(failure.stderr).toBe("");
    expect(JSON.parse(failure.stdout)).toMatchObject({ passed: 0, failed: 1 });
    await writeFile(suiteFile, '{"profile":"WLS-TEST/1","cases":[]}');
    const invalid = spawnSync(executable, [cli, "test", suiteFile], options);
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe("");
    expect(invalid.stderr).toContain("Suite must contain between 1 and 64 cases.");
  });

  it.each(["null", "[]", "42", '"text"', '{"items":', '{"items":["x"],"bad-name":1}'])(
    "rejects invalid JSON/register inputs %s", async text => {
      await writeFile(input, text);
      await expect(runCollectionCommand(["run", program, input])).rejects.toThrow();
    },
  );

  it("rejects malformed lists through the actual VM", async () => {
    await writeFile(input, '{"items":[1]}');
    await expect(runCollectionCommand(["run", program, input])).rejects.toThrow("Invalid collection item");
  });

  it("rejects foreign source and never treats serialized bytecode as executable", async () => {
    for (const text of ['console.log("not executed")', '{"op":"RETURN","args":["x"]}', "WLS-PY/1\nRETURN"]) {
      await writeFile(program, text);
      await expect(runCollectionCommand(["compile", program])).rejects.toThrow("Unsupported collection source version");
    }
  });

  it("accepts valid multibyte source and JSON exactly at their character limits", async () => {
    const paddedSource = source + "\n//" + "é".repeat(COLLECTION_LIMITS.sourceLength - source.length - 3);
    const json = '{"items":["Ψ🌊"]}';
    await writeFile(program, paddedSource);
    await writeFile(input, json + " ".repeat(COLLECTION_CLI_INPUT_LIMIT - json.length));
    expect(await runCollectionCommand(["run", program, input])).toMatchObject({ value: 1, cycles: 2 });
  });

  it("enforces source and JSON character limits independently of byte limits", async () => {
    await writeFile(program, "x".repeat(COLLECTION_LIMITS.sourceLength + 1));
    await expect(runCollectionCommand(["compile", program])).rejects.toThrow("Source exceeds its size limit");
    await writeFile(program, source);
    await writeFile(input, " ".repeat(COLLECTION_CLI_INPUT_LIMIT + 1));
    await expect(runCollectionCommand(["run", program, input])).rejects.toThrow("Inputs exceeds its size limit");
  });

  it("rejects byte-overflow, invalid UTF-8, missing files and directories", async () => {
    await writeFile(program, Buffer.alloc(COLLECTION_LIMITS.sourceLength * 4 + 1, 97));
    await expect(runCollectionCommand(["compile", program])).rejects.toThrow("size limit");
    await writeFile(program, Buffer.from([0xff]));
    await expect(runCollectionCommand(["compile", program])).rejects.toThrow("valid UTF-8");
    await expect(runCollectionCommand(["compile", join(root, "absent")])).rejects.toThrow("Cannot read source file");
    await expect(runCollectionCommand(["compile", root])).rejects.toThrow("regular file");
  });

  it("keeps the VM cycle bound for a valid nonterminating program", async () => {
    await writeFile(program, 'WLS-COLLECTION/1\n:loop\nJUMP ["loop"]\nRETURN ["unused"]');
    await expect(runCollectionCommand(["run", program, input])).rejects.toThrow("cycle limit");
  });

  it.skipIf(process.platform === "win32")("rejects a named pipe without waiting for a writer", () => {
    const pipe = join(root, "not-a-regular-file");
    execFileSync("mkfifo", [pipe], { timeout: 5_000 });
    const result = spawnSync(resolve("node_modules/.bin/tsx"), [
      resolve("scripts/wls-collections-cli.ts"), "compile", pipe,
    ], { encoding: "utf8", timeout: 10_000, maxBuffer: 256_000 });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toBe("WLS collection error: Source must be a regular file.\n");
  });

  it("runs as a separate local process and returns nonzero, non-leaking errors", () => {
    const cli = resolve("scripts/wls-collections-cli.ts");
    const executable = resolve("node_modules/.bin/tsx");
    const options = { encoding: "utf8" as const, timeout: 10_000, maxBuffer: 256_000 };
    const output = execFileSync(executable, [cli, "run", program, input], options);
    expect(JSON.parse(output)).toEqual({ profile: "WLS-COLLECTION/1", value: 2, cycles: 2 });
    const missing = join(root, "sensitive-path");
    const failure = spawnSync(executable, [cli, "compile", missing], options);
    expect(failure.error).toBeUndefined();
    expect(failure.status).toBe(1);
    expect(failure.stdout).toBe("");
    expect(failure.stderr).toBe("WLS collection error: Cannot read source file.\n");
    expect(failure.stderr).not.toContain(missing);
  });
});
