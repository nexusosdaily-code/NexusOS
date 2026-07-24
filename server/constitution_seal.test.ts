/**
 * constitution_seal.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for sealConstitution() focusing on DB failure resilience and
 * advisory lock serialisation guarantees.
 *
 * Tests run entirely against mocked pool objects — no live DB required.
 *
 * Scenarios covered:
 *   1. DB error thrown mid-transaction (after BEGIN) → ROLLBACK + release called,
 *      error re-thrown, chain left untouched.
 *   2. Advisory lock held briefly by another connection (simulated via async delay)
 *      → call blocks until lock is available, then seals successfully.
 *   3. Already-sealed constitution (idempotency) → returns false, no insert.
 *   4. Two concurrent sealConstitution() calls → exactly one seals, the other
 *      discovers the existing block and returns false without corrupting state.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Mock server/db.ts before importing the module under test ─────────────────
// sealConstitution() does `await import("./db")` inside the function body;
// vitest intercepts all module resolutions — including dynamic imports — so
// this mock is active for every call made during the tests.

const mockPoolQuery  = vi.fn();
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

import { sealConstitution, computeConstitutionHash } from "./constitution_seal";

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
  // constCheck — constitution_block_number row already present
  if (sql.includes("constitution_block_number")) return { rows: [{ value: "1" }] };
  return { rows: [] };
}

// ── Test setup / teardown ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: pool.query (used for CREATE TABLE) always succeeds.
  mockPoolQuery.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("sealConstitution() — DB failure mid-transaction", () => {
  it(
    "re-throws the error, calls ROLLBACK on the client, and releases the connection",
    async () => {
      // Arrange: client succeeds on BEGIN but throws when the advisory lock
      // query fires (simulating a network partition / DB crash mid-tx).
      const errDB = new Error("DB: connection terminated unexpectedly");

      const mockClient = makeMockClient(async (sql) => {
        if (sql.includes("pg_advisory_xact_lock")) throw errDB;
        return { rows: [] };
      });

      mockPoolConnect.mockResolvedValue(mockClient);

      // Act
      await expect(sealConstitution()).rejects.toThrow(errDB.message);

      // Assert — ROLLBACK must have been attempted
      const rollbackCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.trim() === "ROLLBACK",
      );
      expect(rollbackCall, "ROLLBACK must be sent to the DB after a mid-tx error").toBeDefined();

      // Assert — connection must be released back to the pool
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    },
  );

  it(
    "does not leave a partial INSERT in blockchain_blocks when the INSERT itself throws",
    async () => {
      // This path exercises the second transaction (post-ceEncode).
      // The INSERT into blockchain_blocks throws — we verify ROLLBACK + release.
      let connectCall = 0;
      const clients: ReturnType<typeof makeMockClient>[] = [];

      mockPoolConnect.mockImplementation(async () => {
        connectCall++;

        if (connectCall === 1) {
          // First connection: pre-ceEncode transaction (blockCheck → no block → COMMIT)
          const c = makeMockClient(async (sql) => {
            if (sql.includes("CONSTITUTION_SEAL[v1]")) return { rows: [] };
            return { rows: [] };
          });
          clients.push(c);
          return c;
        }

        // Second connection: the actual INSERT transaction — throw on INSERT
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

      // The second client (that ran the INSERT) must have been rolled back and released
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
      // Simulate a lock held by another DB session for 40 ms.
      // pg_advisory_xact_lock blocks at the server; here we model it as an
      // async delay that resolves once the 'other session' finishes.
      const LOCK_HOLD_MS = 40;
      let connectCall = 0;

      mockPoolConnect.mockImplementation(async () => {
        connectCall++;
        const c = makeMockClient(async (sql) => {
          if (sql.includes("pg_advisory_xact_lock")) {
            // Both transactions must wait — simulates real lock wait
            await new Promise<void>((r) => setTimeout(r, LOCK_HOLD_MS));
            return { rows: [] };
          }
          if (sql.includes("CONSTITUTION_SEAL[v1]")) return { rows: [] }; // not sealed yet
          if (sql.includes("MAX(block_number)"))       return { rows: [{ max_num: 0 }] };
          if (sql.includes("ORDER BY block_number DESC LIMIT 1")) return { rows: [] };
          return { rows: [] };
        });
        return c;
      });

      const start  = Date.now();
      const result = await sealConstitution();
      const elapsed = Date.now() - start;

      // Successfully sealed after waiting for the lock
      expect(result).toBe(true);

      // Must have waited at least twice the lock hold (two advisory lock waits)
      expect(elapsed).toBeGreaterThanOrEqual(LOCK_HOLD_MS * 2 - 5);
    },
  );

  it(
    "two concurrent calls: exactly one seals (true) and one is no-op (false) — no double-insert",
    async () => {
      // Shared state representing the DB's blockchain_blocks table.
      // Each call gets its own mock client; they share `sealedInDb` to model
      // the serialisation that pg_advisory_xact_lock provides in production.
      let sealedInDb = false;
      let blockInsertCount = 0;

      mockPoolConnect.mockImplementation(async () => {
        return makeMockClient(async (sql) => {
          if (sql.includes("pg_advisory_xact_lock")) {
            // Yield to the event loop — this gives the sibling call a chance
            // to progress, modelling the interleaving that makes concurrency
            // interesting.  The advisory lock ensures exactly one winner.
            await Promise.resolve();
            return { rows: [] };
          }
          if (sql.includes("CONSTITUTION_SEAL[v1]")) {
            // Both blockCheck and doubleCheck consult the shared DB state
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

      // Exactly one call must have sealed, the other must have been a no-op
      expect(r1 !== r2, "one call returns true, the other returns false").toBe(true);
      expect([r1, r2]).toContain(true);
      expect([r1, r2]).toContain(false);

      // The INSERT into blockchain_blocks must have fired exactly once
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

      // No INSERT into blockchain_blocks must have occurred
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
        // constCheck — no rows yet (constants missing)
        if (sql.includes("constitution_block_number") && sql.includes("SELECT value")) {
          return { rows: [] };
        }
        // Track the backfill INSERT
        if (sql.includes("INSERT INTO system_constants")) {
          insertedKeys.push("backfill");
          return { rows: [] };
        }
        return { rows: [] };
      });

      mockPoolConnect.mockResolvedValue(mockClient);

      const result = await sealConstitution();

      expect(result).toBe(false);

      // The backfill INSERT must have fired
      expect(insertedKeys.length).toBeGreaterThan(0);

      // But blockchain_blocks must remain untouched
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
