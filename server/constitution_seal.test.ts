/**
 * constitution_seal.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the constitution sealing and read paths.
 *
 * sealConstitution() — DB failure resilience and advisory lock serialisation.
 *   Tests run entirely against mocked pool objects — no live DB required.
 *   Scenarios covered:
 *     1. DB error thrown mid-transaction → ROLLBACK + release called, re-thrown.
 *     2. Advisory lock held briefly by another connection → blocks then seals.
 *     3. Already-sealed constitution (idempotency) → returns false, no insert.
 *     4. Two concurrent calls → exactly one seals, no double-insert.
 *
 * mapAmendmentRows() — pure function, no DB required.
 *   Covers: empty input, null/undefined input, well-formed rows, malformed
 *   content fallback, null band default, mined_at as Date/ISO string/absent,
 *   multi-row ordering.
 *
 * getConstitutionSeal() — amendments array always present on both DB paths.
 *   Uses a FIFO queue-based pool stub injected via the poolOverride parameter.
 *   Covers: primary path ±amendments, fallback path ±amendments, table missing,
 *   JSON round-trip key presence for both paths.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Mock server/db.ts before importing the module under test ─────────────────
// sealConstitution() does `await import("./db")` inside the function body;
// vitest intercepts all module resolutions — including dynamic imports — so
// this mock is active for every call made during the tests.

const mockPoolQuery   = vi.fn();
const mockPoolConnect = vi.fn();

vi.mock("./db", () => ({
  pool: {
    query:   mockPoolQuery,
    connect: mockPoolConnect,
  },
}));

// Block all outbound fetch calls so ceEncodeHash() falls through its catch
// and returns null (it is best-effort — the seal should proceed regardless).
vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch blocked in tests")));

import {
  sealConstitution,
  computeConstitutionHash,
  mapAmendmentRows,
  getConstitutionSeal,
  type QueryablePool,
} from "./constitution_seal";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a mock pg client whose query() behaviour is driven by a handler
 * function. `release` is always a spy.
 */
function makeMockClient(
  handler: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>,
): { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> } {
  const release = vi.fn();
  const query   = vi.fn((sql: string, params?: unknown[]) => handler(sql, params));
  return { query, release };
}

/**
 * A query handler for the "already sealed" path.
 * blockCheck returns an existing block row; constCheck returns an existing row.
 */
async function alreadySealedHandler(sql: string): Promise<{ rows: unknown[] }> {
  if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
  if (sql.includes("CONSTITUTION_SEAL[v1]")) {
    return {
      rows: [
        {
          id:           1,
          block_number: 1,
          psi_channel:  "Ψ(52,20,H)",
          mined_at:     new Date("2026-06-23T00:00:00Z"),
        },
      ],
    };
  }
  if (sql.includes("constitution_block_number")) return { rows: [{ value: "1" }] };
  return { rows: [] };
}

/** Returns a pool whose .query() answers calls in FIFO order from `responses`. */
function makePool(responses: Array<{ rows: any[] }>): QueryablePool {
  const queue = [...responses];
  return {
    query: async (_sql: string, _params?: any[]) =>
      queue.shift() ?? { rows: [] },
  };
}

// Reusable rows for the constitution seal block (primary path)
const SEAL_ROW = {
  block_number: "1",
  psi_channel:  "Ψ(52,20,H)",
  wavelength_nm: "542.5000",
  content:
    "CONSTITUTION_SEAL[v1]: NexusOS Constitutional Declaration | " +
    "hash:sha256=" + "a".repeat(64),
  mined_at: new Date("2026-06-23T10:00:00.000Z"),
};

// Reusable system_constants rows (fallback path)
const CONSTANTS_ROWS = [
  { key: "constitution_block_number",  value: "1" },
  { key: "constitution_psi_channel",   value: "Ψ(52,20,H)" },
  { key: "constitution_wavelength_nm", value: "542.5" },
  { key: "constitution_hash",          value: "a".repeat(64) },
  { key: "constitution_sealed_at",     value: "2026-06-23T10:00:00.000Z" },
];

// ── Test setup / teardown ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockPoolQuery.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// sealConstitution() tests
// ═══════════════════════════════════════════════════════════════════════════

describe("sealConstitution() — DB failure mid-transaction", () => {
  it(
    "re-throws the error, calls ROLLBACK on the client, and releases the connection",
    async () => {
      const errDB = new Error("DB: connection terminated unexpectedly");

      const mockClient = makeMockClient(async (sql) => {
        if (sql.includes("pg_advisory_xact_lock")) throw errDB;
        return { rows: [] };
      });

      mockPoolConnect.mockResolvedValue(mockClient);

      await expect(sealConstitution()).rejects.toThrow(errDB.message);

      const rollbackCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.trim() === "ROLLBACK",
      );
      expect(rollbackCall, "ROLLBACK must be sent to the DB after a mid-tx error").toBeDefined();
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    },
  );

  it(
    "does not leave a partial INSERT in blockchain_blocks when the INSERT itself throws",
    async () => {
      let connectCall = 0;
      const clients: ReturnType<typeof makeMockClient>[] = [];

      mockPoolConnect.mockImplementation(async () => {
        connectCall++;

        if (connectCall === 1) {
          const c = makeMockClient(async (sql) => {
            if (sql.includes("CONSTITUTION_SEAL[v1]")) return { rows: [] };
            return { rows: [] };
          });
          clients.push(c);
          return c;
        }

        const errInsert = new Error("DB: disk full");
        const c = makeMockClient(async (sql) => {
          if (sql.includes("INSERT INTO blockchain_blocks")) throw errInsert;
          if (sql.includes("MAX(block_number)")) return { rows: [{ max_num: 0 }] };
          return { rows: [] };
        });
        clients.push(c);
        return c;
      });

      await expect(sealConstitution()).rejects.toThrow("DB: disk full");

      const secondClient = clients[1];
      expect(secondClient, "second connection must have been obtained").toBeDefined();

      const rollbackCall = secondClient.query.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.trim() === "ROLLBACK",
      );
      expect(rollbackCall, "ROLLBACK must be sent after the failed INSERT").toBeDefined();
      expect(secondClient.release).toHaveBeenCalledTimes(1);
    },
  );
});

describe("sealConstitution() — advisory lock contention", () => {
  it(
    "blocks until the advisory lock is released then seals successfully (returns true)",
    async () => {
      const LOCK_HOLD_MS = 40;
      let connectCall = 0;

      mockPoolConnect.mockImplementation(async () => {
        connectCall++;
        const c = makeMockClient(async (sql) => {
          if (sql.includes("pg_advisory_xact_lock")) {
            await new Promise<void>((r) => setTimeout(r, LOCK_HOLD_MS));
            return { rows: [] };
          }
          if (sql.includes("CONSTITUTION_SEAL[v1]")) return { rows: [] };
          if (sql.includes("MAX(block_number)"))       return { rows: [{ max_num: 0 }] };
          if (sql.includes("ORDER BY block_number DESC LIMIT 1")) return { rows: [] };
          return { rows: [] };
        });
        return c;
      });

      const start   = Date.now();
      const result  = await sealConstitution();
      const elapsed = Date.now() - start;

      expect(result).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(LOCK_HOLD_MS * 2 - 5);
    },
  );

  it(
    "two concurrent calls: exactly one seals (true) and one is no-op (false) — no double-insert",
    async () => {
      let sealedInDb = false;
      let blockInsertCount = 0;

      mockPoolConnect.mockImplementation(async () => {
        return makeMockClient(async (sql) => {
          if (sql.includes("pg_advisory_xact_lock")) {
            await Promise.resolve();
            return { rows: [] };
          }
          if (sql.includes("CONSTITUTION_SEAL[v1]")) {
            if (sealedInDb) {
              return {
                rows: [
                  {
                    id:           1,
                    block_number: 1,
                    psi_channel:  "Ψ(52,20,H)",
                    mined_at:     new Date(),
                  },
                ],
              };
            }
            return { rows: [] };
          }
          if (sql.includes("INSERT INTO blockchain_blocks")) {
            blockInsertCount++;
            sealedInDb = true;
            return { rows: [] };
          }
          if (sql.includes("MAX(block_number)"))              return { rows: [{ max_num: 0 }] };
          if (sql.includes("ORDER BY block_number DESC LIMIT 1")) return { rows: [] };
          if (sql.includes("constitution_block_number")) {
            return sealedInDb ? { rows: [{ value: "1" }] } : { rows: [] };
          }
          return { rows: [] };
        });
      });

      const [r1, r2] = await Promise.all([sealConstitution(), sealConstitution()]);

      expect(r1 !== r2, "one call returns true, the other returns false").toBe(true);
      expect([r1, r2]).toContain(true);
      expect([r1, r2]).toContain(false);
      expect(blockInsertCount).toBe(1);
    },
  );
});

describe("sealConstitution() — idempotency (already sealed)", () => {
  it(
    "returns false when the constitution block already exists and does not re-insert",
    async () => {
      const mockClient = makeMockClient(alreadySealedHandler);
      mockPoolConnect.mockResolvedValue(mockClient);

      const result = await sealConstitution();

      expect(result).toBe(false);

      const insertCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO blockchain_blocks"),
      );
      expect(insertCall).toBeUndefined();
    },
  );

  it(
    "backfills system_constants when block exists but constants row is missing, then returns false",
    async () => {
      const insertedKeys: string[] = [];

      const mockClient = makeMockClient(async (sql) => {
        if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
        if (sql.includes("CONSTITUTION_SEAL[v1]")) {
          return {
            rows: [
              {
                id:           2,
                block_number: 2,
                psi_channel:  "Ψ(52,20,H)",
                mined_at:     new Date("2026-06-23T12:00:00Z"),
              },
            ],
          };
        }
        if (sql.includes("constitution_block_number") && sql.includes("SELECT value")) {
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO system_constants")) {
          insertedKeys.push("backfill");
          return { rows: [] };
        }
        return { rows: [] };
      });

      mockPoolConnect.mockResolvedValue(mockClient);

      const result = await sealConstitution();

      expect(result).toBe(false);
      expect(insertedKeys.length).toBeGreaterThan(0);

      const blockInsert = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO blockchain_blocks"),
      );
      expect(blockInsert).toBeUndefined();
    },
  );

  it(
    "backfill writes every constant with values derived exactly from the surviving block row",
    async () => {
      // Simulate the partial-failure state: blockchain_blocks has the seal block
      // but system_constants was never written (crash between INSERT and upsert).
      const crashedBlock = {
        id:           7,
        block_number: 7,
        psi_channel:  "Ψ(52,20,H)",
        mined_at:     new Date("2026-05-16T08:00:00.000Z"),
      };

      let backfillParams: unknown[] | null = null;

      const mockClient = makeMockClient(async (sql, params) => {
        if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
        if (sql.includes("CONSTITUTION_SEAL[v1]")) {
          return { rows: [crashedBlock] };
        }
        // constCheck — constants missing (mid-seal crash state)
        if (sql.includes("constitution_block_number") && sql.includes("SELECT value")) {
          return { rows: [] };
        }
        // Capture the exact backfill params
        if (sql.includes("INSERT INTO system_constants")) {
          backfillParams = params ?? null;
          return { rows: [] };
        }
        return { rows: [] };
      });

      mockPoolConnect.mockResolvedValue(mockClient);

      const result = await sealConstitution();

      expect(result).toBe(false);
      expect(backfillParams, "backfill INSERT must have fired").not.toBeNull();

      // The INSERT binds: ($1=block_number, $2=now/sealed_at, $3=psi_channel,
      //                    $4=wavelength_nm, $5=hash)
      const [p1, p2, p3, p4, p5] = backfillParams as [string, string, string, string, string];

      // $1 — block_number: must match the surviving block's number exactly
      expect(p1).toBe(String(crashedBlock.block_number));

      // $2 — sealed_at / timestamps: must be derived from mined_at, not now()
      expect(p2).toBe(crashedBlock.mined_at.toISOString());

      // $3 — psi_channel: must carry forward the Ψ channel from the block row
      expect(p3).toBe(crashedBlock.psi_channel);

      // $4 — wavelength_nm: must match the SYSTEM band constant (542.5 nm)
      expect(p4).toBe("542.5");

      // $5 — hash: must be the deterministic SHA-256 of the canonical constitutional text
      expect(p5).toBe(computeConstitutionHash());
    },
  );

  it(
    "second boot after mid-seal crash recovers to fully consistent state without user intervention",
    async () => {
      // The chain state after a crash between block INSERT and constants upsert:
      //   • blockchain_blocks row EXISTS  (block was committed before crash)
      //   • system_constants rows MISSING (upsert never ran)
      // On the next boot, sealConstitution() must silently repair the gap.
      const crashedBlock = {
        id:           3,
        block_number: 3,
        psi_channel:  "Ψ(52,20,H)",
        mined_at:     new Date("2026-06-01T09:30:00.000Z"),
      };

      let backfillFired  = false;
      let newBlockMined  = false;

      const mockClient = makeMockClient(async (sql) => {
        if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
        if (sql.includes("CONSTITUTION_SEAL[v1]")) {
          return { rows: [crashedBlock] };
        }
        // Constants are absent — simulating the partial write state
        if (sql.includes("SELECT value") && sql.includes("constitution_block_number")) {
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO system_constants")) {
          backfillFired = true;
          return { rows: [] };
        }
        // A new block must NOT be mined during backfill
        if (sql.includes("INSERT INTO blockchain_blocks")) {
          newBlockMined = true;
          return { rows: [] };
        }
        return { rows: [] };
      });

      mockPoolConnect.mockResolvedValue(mockClient);

      const result = await sealConstitution();

      // Must return false — block already exists, this was a recovery, not a fresh seal
      expect(result).toBe(false);

      // Constants backfill must have run to restore the missing rows
      expect(backfillFired).toBe(true);

      // The chain must be untouched — no second block should be mined
      expect(newBlockMined).toBe(false);
    },
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// mapAmendmentRows() tests — pure function, no DB required
// ═══════════════════════════════════════════════════════════════════════════

describe("mapAmendmentRows — pure function", () => {

  it("returns [] for an empty array", () => {
    expect(mapAmendmentRows([])).toEqual([]);
  });

  it("returns [] for null input (defensive guard)", () => {
    expect(mapAmendmentRows(null as any)).toEqual([]);
  });

  it("returns [] for undefined input (defensive guard)", () => {
    expect(mapAmendmentRows(undefined as any)).toEqual([]);
  });

  it("maps a well-formed amendment row correctly", () => {
    const now = new Date("2026-07-10T12:00:00.000Z");
    const result = mapAmendmentRows([{
      block_number: "42",
      content: "CONSTITUTION_AMENDMENT[v1]: Extend Article III | author=nexus | t=1234",
      band: "SYSTEM",
      mined_at: now,
    }]);
    expect(result.length).toBe(1);
    expect(result[0].blockNumber).toBe(42);
    expect(result[0].title).toBe("Extend Article III");
    expect(result[0].authoredBand).toBe("SYSTEM");
    expect(result[0].timestamp).toBe(now.toISOString());
  });

  it("falls back to generated title when content is malformed", () => {
    const result = mapAmendmentRows([{
      block_number: "7",
      content: "GARBAGE — not an amendment header",
      band: "KERNEL",
      mined_at: new Date(),
    }]);
    expect(result[0].title).toBe("Amendment block #7");
    expect(result[0].authoredBand).toBe("KERNEL");
  });

  it("defaults authoredBand to SYSTEM when band is null", () => {
    const result = mapAmendmentRows([{
      block_number: "3",
      content: "CONSTITUTION_AMENDMENT[v1]: Test | t=1",
      band: null,
      mined_at: null,
    }]);
    expect(result[0].authoredBand).toBe("SYSTEM");
    expect(result[0].timestamp).toBe("");
  });

  it("handles mined_at as ISO string", () => {
    const isoStr = "2026-06-23T10:30:00.000Z";
    const result = mapAmendmentRows([{
      block_number: "5",
      content: "CONSTITUTION_AMENDMENT[v2]: ISO date test | t=99",
      band: "SYSTEM",
      mined_at: isoStr,
    }]);
    expect(result[0].timestamp).toBe(isoStr);
  });

  it("handles mined_at absent (undefined)", () => {
    const result = mapAmendmentRows([{
      block_number: "9",
      content: "CONSTITUTION_AMENDMENT[v1]: No Date | t=0",
      band: "SYSTEM",
    }]);
    expect(result[0].timestamp).toBe("");
  });

  it("maps multiple rows and preserves order", () => {
    const result = mapAmendmentRows([
      { block_number: "10", content: "CONSTITUTION_AMENDMENT[v1]: First | t=1",  band: "SYSTEM", mined_at: new Date("2026-07-01T00:00:00.000Z") },
      { block_number: "20", content: "CONSTITUTION_AMENDMENT[v2]: Second | t=2", band: "KERNEL", mined_at: new Date("2026-07-02T00:00:00.000Z") },
    ]);
    expect(result.length).toBe(2);
    expect(result[0].blockNumber).toBe(10);
    expect(result[0].title).toBe("First");
    expect(result[1].blockNumber).toBe(20);
    expect(result[1].title).toBe("Second");
    expect(result[1].authoredBand).toBe("KERNEL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getConstitutionSeal() tests — amendments array always present
//
// Query order inside getConstitutionSeal:
//   1. tableCheck   — SELECT EXISTS (system_constants table)
//   2. blockRow     — SELECT from blockchain_blocks WHERE CONSTITUTION_SEAL
//   3. amendmentRows — SELECT from blockchain_blocks WHERE CONSTITUTION_AMENDMENT
//   [only if blockRow is empty:]
//   4. constRows    — SELECT from system_constants
// ═══════════════════════════════════════════════════════════════════════════

describe("getConstitutionSeal — amendments array always present", () => {

  it("primary path (seal block found) + no amendments → amendments is []", async () => {
    const pool = makePool([
      { rows: [{ exists: true }] },   // 1. tableCheck
      { rows: [SEAL_ROW] },           // 2. blockRow
      { rows: [] },                   // 3. amendmentRows (empty chain)
    ]);

    const result = await getConstitutionSeal(pool);

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.amendments)).toBe(true);
    expect(result!.amendments.length).toBe(0);
  });

  it("primary path + one amendment block → amendments has one entry", async () => {
    const amendRow = {
      block_number: "5",
      content: "CONSTITUTION_AMENDMENT[v1]: Extend Article III | t=0",
      band: "SYSTEM",
      mined_at: new Date("2026-07-15T00:00:00.000Z"),
    };

    const pool = makePool([
      { rows: [{ exists: true }] },
      { rows: [SEAL_ROW] },
      { rows: [amendRow] },
    ]);

    const result = await getConstitutionSeal(pool);

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.amendments)).toBe(true);
    expect(result!.amendments.length).toBe(1);
    expect(result!.amendments[0].blockNumber).toBe(5);
    expect(result!.amendments[0].title).toBe("Extend Article III");
    expect(result!.amendments[0].authoredBand).toBe("SYSTEM");
  });

  it("primary path + multiple amendments → amendments has all entries in order", async () => {
    const pool = makePool([
      { rows: [{ exists: true }] },
      { rows: [SEAL_ROW] },
      {
        rows: [
          { block_number: "10", content: "CONSTITUTION_AMENDMENT[v1]: First | t=1",  band: "SYSTEM", mined_at: new Date("2026-07-01T00:00:00.000Z") },
          { block_number: "20", content: "CONSTITUTION_AMENDMENT[v2]: Second | t=2", band: "KERNEL", mined_at: new Date("2026-07-02T00:00:00.000Z") },
        ],
      },
    ]);

    const result = await getConstitutionSeal(pool);

    expect(result).not.toBeNull();
    expect(result!.amendments.length).toBe(2);
    expect(result!.amendments[0].blockNumber).toBe(10);
    expect(result!.amendments[1].blockNumber).toBe(20);
  });

  it("fallback path (system_constants) + no amendments → amendments is []", async () => {
    const pool = makePool([
      { rows: [{ exists: true }] },   // 1. tableCheck
      { rows: [] },                   // 2. blockRow — no seal in blockchain_blocks
      { rows: [] },                   // 3. amendmentRows (empty)
      { rows: CONSTANTS_ROWS },       // 4. system_constants fallback
    ]);

    const result = await getConstitutionSeal(pool);

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.amendments)).toBe(true);
    expect(result!.amendments.length).toBe(0);
  });

  it("fallback path + one amendment block → amendments has one entry", async () => {
    const amendRow = {
      block_number: "7",
      content: "CONSTITUTION_AMENDMENT[v1]: Fallback amendment | t=0",
      band: "KERNEL",
      mined_at: new Date("2026-07-20T00:00:00.000Z"),
    };

    const pool = makePool([
      { rows: [{ exists: true }] },
      { rows: [] },
      { rows: [amendRow] },
      { rows: CONSTANTS_ROWS },
    ]);

    const result = await getConstitutionSeal(pool);

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.amendments)).toBe(true);
    expect(result!.amendments.length).toBe(1);
    expect(result!.amendments[0].title).toBe("Fallback amendment");
  });

  it("system_constants table missing → returns null (not undefined amendments)", async () => {
    const pool = makePool([
      { rows: [{ exists: false }] },  // tableCheck — table not ready
    ]);

    const result = await getConstitutionSeal(pool);

    expect(result).toBeNull();
  });

  it("amendments key survives JSON round-trip for both paths", async () => {
    // Primary path
    const primary = await getConstitutionSeal(makePool([
      { rows: [{ exists: true }] },
      { rows: [SEAL_ROW] },
      { rows: [] },
    ]));
    expect(primary).not.toBeNull();
    const primaryJson = JSON.parse(JSON.stringify(primary));
    expect("amendments" in primaryJson).toBe(true);
    expect(Array.isArray(primaryJson.amendments)).toBe(true);

    // Fallback path
    const fallback = await getConstitutionSeal(makePool([
      { rows: [{ exists: true }] },
      { rows: [] },
      { rows: [] },
      { rows: CONSTANTS_ROWS },
    ]));
    expect(fallback).not.toBeNull();
    const fallbackJson = JSON.parse(JSON.stringify(fallback));
    expect("amendments" in fallbackJson).toBe(true);
    expect(Array.isArray(fallbackJson.amendments)).toBe(true);
  });
});
