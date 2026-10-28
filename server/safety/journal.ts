import { open, mkdir, readFile, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { eventSchema, hash } from "./protocol";
import type { Journal, JournalRecord } from "./controller";

/**
 * Use only on the independently administered safety host.
 * Signed events detect alteration; a separately retained checkpoint detects
 * rollback/truncation. A local hash chain alone does not provide independence.
 */
export class FileJournal implements Journal {
  private lock: FileHandle | undefined;
  constructor(private file: string, private expectedCheckpoint: { sequence: number; head: string }) {}
  async read(): Promise<JournalRecord[]> {
    await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    // Single writer across processes. A stale lock needs independent recovery, not auto-deletion.
    this.lock = await open(`${this.file}.lock`, "wx", 0o600);
    let contents: string;
    try { contents = await readFile(this.file, "utf8"); }
    catch (error: any) { if (error.code !== "ENOENT") throw error; contents = ""; }
    if (contents && !contents.endsWith("\n")) throw new Error("Incomplete audit commit; independent recovery required");
    const records = contents.split("\n").filter(Boolean).map(line => {
      const record = JSON.parse(line);
      const event = eventSchema.parse(record.event);
      if (record.hash !== hash(event)) throw new Error("Audit alteration detected");
      return { event, hash: record.hash };
    });
    const checkpoint = this.expectedCheckpoint;
    if (records.length !== checkpoint.sequence ||
        (checkpoint.sequence > 0 && records[checkpoint.sequence - 1]?.hash !== checkpoint.head)) {
      throw new Error("Audit checkpoint mismatch; independent reconciliation required");
    }
    return records;
  }
  async append(record: JournalRecord) {
    if (!this.lock) throw new Error("Journal not initialised");
    const handle = await open(this.file, "a", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(record)}\n`, "utf8");
      await handle.sync();
    } finally { await handle.close(); }
  }
}
