/**
 * WNSP Kernel Agents — Autonomous Decision Layer
 * ================================================
 * Four persistent daemon threads run alongside the main server.
 * Each agent has a real work loop against the live database.
 *
 * Agents:
 *   os_kernel        — SYSTEM  — system health snapshots every 3 min
 *   scheduler_daemon — KERNEL  — confirms pending transactions every 60s
 *   watchdog_daemon  — KERNEL  — audits wallets for anomalies every 2 min
 *   auth_gateway     — KERNEL  — assigns missing spectral channels every 5 min
 *
 * State is kept in memory and exposed via GET /api/kernel/status.
 */

import { db } from "./db";
import { eq, and, lt, isNull, sql, desc } from "drizzle-orm";
import { users, wallets, transactions, streams } from "../shared/schema";
import { deriveChannel } from "./physics";

// ── Agent state store ─────────────────────────────────────────────────────────

export interface AgentState {
  agentId:              string;
  displayName:          string;
  band:                 "SYSTEM" | "KERNEL" | "USER" | "GUEST";
  channelNm:            number;
  channelNotation:      string;
  status:               "ACTIVE" | "IDLE" | "ERROR" | "BOOTING";
  lastAction:           string;
  lastRunAt:            number;          // unix ms
  cycleCount:           number;
  totalActionsCompleted: number;
  errorCount:           number;
  lastError?:           string;
}

const _agents: Map<string, AgentState> = new Map();

function initAgent(
  agentId: string,
  displayName: string,
  band: AgentState["band"],
  channelNm: number,
  wdm: number,
  oam: number,
  pol: "H" | "V",
): void {
  _agents.set(agentId, {
    agentId,
    displayName,
    band,
    channelNm,
    channelNotation: `Ψ(${wdm},${oam},${pol})`,
    status:           "BOOTING",
    lastAction:       "Initializing …",
    lastRunAt:        Date.now(),
    cycleCount:       0,
    totalActionsCompleted: 0,
    errorCount:       0,
  });
}

function updateAgent(
  agentId: string,
  patch: Partial<Omit<AgentState, "agentId">>,
): void {
  const s = _agents.get(agentId);
  if (!s) return;
  Object.assign(s, patch, { lastRunAt: Date.now() });
}

export function getAllAgentStates(): AgentState[] {
  return Array.from(_agents.values());
}

// ── Utility: run a loop every `intervalMs`, log errors ───────────────────────

function runLoop(
  agentId: string,
  intervalMs: number,
  fn: () => Promise<void>,
): void {
  const tick = async () => {
    try {
      await fn();
      const s = _agents.get(agentId)!;
      updateAgent(agentId, {
        status:     "ACTIVE",
        cycleCount: s.cycleCount + 1,
      });
    } catch (err: any) {
      const s = _agents.get(agentId);
      updateAgent(agentId, {
        status:     "ERROR",
        lastError:  String(err?.message ?? err),
        errorCount: (s?.errorCount ?? 0) + 1,
      });
      console.error(`[KERNEL] ${agentId} ERROR:`, err?.message);
    }
    setTimeout(tick, intervalMs);
  };
  // First tick with a small stagger so all agents don't fire at once
  const stagger: Record<string, number> = {
    os_kernel:        5_000,
    scheduler_daemon: 10_000,
    watchdog_daemon:  20_000,
    auth_gateway:     30_000,
  };
  setTimeout(tick, stagger[agentId] ?? 5_000);
}

// ── 1. os_kernel — System health snapshot (every 3 min) ──────────────────────

async function osKernelTick() {
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const [walletCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wallets);

  const [pendingTx] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(eq(transactions.status, "pending"));

  const [liveStreams] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(streams)
    .where(eq(streams.status, "live"));

  const [totalFees] = await db
    .select({ total: sql<string>`coalesce(sum(amount::numeric), 0)::text` })
    .from(transactions)
    .where(sql`type IN ('protocol_burn','message_fee','stream_fee','document_fee','upload_fee')`);

  const snap = {
    users:       userCount?.count ?? 0,
    wallets:     walletCount?.count ?? 0,
    pendingTx:   pendingTx?.count ?? 0,
    liveStreams:  liveStreams?.count ?? 0,
    totalFeesNxt: parseFloat(totalFees?.total ?? "0").toFixed(4),
  };

  updateAgent("os_kernel", {
    status:               "ACTIVE",
    lastAction:           `Snapshot — ${snap.users} users · ${snap.liveStreams} live · ${snap.pendingTx} pending · ${snap.totalFeesNxt} NXT in fees`,
    totalActionsCompleted: (_agents.get("os_kernel")?.totalActionsCompleted ?? 0) + 1,
  });

  console.log(`[OS_KERNEL] Snapshot: ${JSON.stringify(snap)}`);
}

// ── 2. scheduler_daemon — Confirm pending transactions (every 60s) ───────────

async function schedulerTick() {
  const cutoff = new Date(Date.now() - 30_000); // 30s old = ready to confirm
  const pending = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "pending"),
        lt(transactions.createdAt, cutoff),
      ),
    )
    .limit(200);

  if (pending.length > 0) {
    await db
      .update(transactions)
      .set({ status: "confirmed" })
      .where(sql`id = ANY(${pending.map(p => p.id)})`);
  }

  const s = _agents.get("scheduler_daemon")!;
  updateAgent("scheduler_daemon", {
    lastAction: pending.length > 0
      ? `Confirmed ${pending.length} pending transaction(s)`
      : "No pending transactions — queue clear",
    totalActionsCompleted: s.totalActionsCompleted + (pending.length > 0 ? 1 : 0),
  });

  if (pending.length > 0) {
    console.log(`[SCHEDULER] Confirmed ${pending.length} transactions`);
  }
}

// ── 3. watchdog_daemon — Wallet anomaly scan (every 2 min) ───────────────────

async function watchdogTick() {
  const allWallets = await db
    .select({ id: wallets.id, balance: wallets.balance, userId: wallets.userId })
    .from(wallets);

  const anomalies: string[] = [];

  for (const w of allWallets) {
    const bal = parseFloat(w.balance);
    if (isNaN(bal)) {
      anomalies.push(`wallet ${w.id}: NaN balance`);
    } else if (bal < 0) {
      anomalies.push(`wallet ${w.id}: negative balance ${bal}`);
      // Auto-correct — floor to zero
      await db
        .update(wallets)
        .set({ balance: "0.00000000" })
        .where(eq(wallets.id, w.id));
    }
  }

  const s = _agents.get("watchdog_daemon")!;
  updateAgent("watchdog_daemon", {
    lastAction: anomalies.length > 0
      ? `⚠ ${anomalies.length} anomaly(s) corrected in ${allWallets.length} wallets`
      : `${allWallets.length} wallets healthy — no anomalies`,
    totalActionsCompleted: s.totalActionsCompleted + (anomalies.length > 0 ? 1 : 0),
  });

  if (anomalies.length > 0) {
    console.log(`[WATCHDOG] Anomalies: ${anomalies.join(", ")}`);
  }
}

// ── 4. auth_gateway — Spectral channel audit (every 5 min) ───────────────────

async function authGatewayTick() {
  // Find users missing spectral channel assignment
  const unassigned = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(isNull(users.spectralWdm))
    .limit(50);

  let assigned = 0;
  for (const u of unassigned) {
    try {
      const ch = deriveChannel(u.username);
      await db
        .update(users)
        .set({
          spectralWdm:  ch.wdm,
          spectralOam:  ch.oam,
          spectralPol:  ch.pol,
          spectralNm:   ch.nm.toFixed(6),
          spectralBand: ch.band,
        })
        .where(eq(users.id, u.id));
      assigned++;
    } catch {
      // skip individual failures
    }
  }

  const s = _agents.get("auth_gateway")!;
  updateAgent("auth_gateway", {
    lastAction: assigned > 0
      ? `Assigned spectral channels to ${assigned} user(s)`
      : `All users have spectral channels — authority layer clean`,
    totalActionsCompleted: s.totalActionsCompleted + (assigned > 0 ? 1 : 0),
  });

  if (assigned > 0) {
    console.log(`[AUTH_GATEWAY] Assigned ${assigned} spectral channels`);
  }
}

// ── Boot all agents ───────────────────────────────────────────────────────────

export function startKernelAgents(): void {
  // Register agents with their deterministic Ψ channels (from SHA-256 of agent name)
  initAgent("os_kernel",        "OS Kernel",        "SYSTEM", 420.5,  8,  0, "H");
  initAgent("scheduler_daemon", "Scheduler Daemon", "KERNEL", 492.0,  80, 5, "H");
  initAgent("watchdog_daemon",  "Watchdog Daemon",  "KERNEL", 510.0,  95, 10, "V");
  initAgent("auth_gateway",     "Auth Gateway",     "KERNEL", 530.0,  110, 15, "H");

  runLoop("os_kernel",        3 * 60_000, osKernelTick);
  runLoop("scheduler_daemon", 60_000,     schedulerTick);
  runLoop("watchdog_daemon",  2 * 60_000, watchdogTick);
  runLoop("auth_gateway",     5 * 60_000, authGatewayTick);

  console.log("[KERNEL AGENTS] 4 autonomous agents started");
}
