import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileJournal } from "./journal";
import { fixture } from "./test-fixture";

describe("independently retained audit checkpoints", () => {
  it("rejects truncated, missing and partially written journals", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "safety-audit-"));
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    const expected = f.controller.checkpoint();
    try {
      const missing = new FileJournal(path.join(dir, "missing.jsonl"), expected);
      await expect(missing.read()).rejects.toThrow(/checkpoint/);
      const partialPath = path.join(dir, "partial.jsonl");
      await writeFile(partialPath, JSON.stringify(f.records[0]));
      await expect(new FileJournal(partialPath, expected).read()).rejects.toThrow(/Incomplete/);
      const alteredPath = path.join(dir, "altered.jsonl");
      await writeFile(alteredPath, JSON.stringify({ ...f.records[0], hash: "0".repeat(64) }) + "\n");
      await expect(new FileJournal(alteredPath, expected).read()).rejects.toThrow(/alteration/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it("durably appends and excludes a second writer", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "safety-audit-"));
    const file = path.join(dir, "audit.jsonl");
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    try {
      const journal = new FileJournal(file, { sequence: 0, head: f.GENESIS_HASH });
      expect(await journal.read()).toEqual([]);
      await journal.append(f.records[0]);
      expect(JSON.parse((await readFile(file, "utf8")).trim())).toEqual(f.records[0]);
      await expect(new FileJournal(file, f.controller.checkpoint()).read()).rejects.toThrow(/EEXIST/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
