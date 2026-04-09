/**
 * blockchain_auditor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Autonomous kernel agent — monitors the spectral DB mempool and mines proof
 * blocks on a schedule. Registered in wnsp_agents as authority band AUTH.
 *
 * Lifecycle:
 *   1. On boot: registers agent in wnsp_agents (upsert)
 *   2. Every `intervalMs` ms: check mempool for pending SPECTRAL_AUDIT txs
 *   3. If count >= threshold: mine a proof block, log to wnsp_bus_log
 *   4. Heartbeat: update `updated_at` in wnsp_agents on every cycle
 */

import { db } from "./db";
import { sql as drizzleSql, eq, inArray, desc } from "drizzle-orm";

// ── Agent config (mutable via API) ────────────────────────────────────────────
export interface AuditorConfig {
  enabled:      boolean;
  intervalMs:   number;   // default 5 min
  threshold:    number;   // min pending txs before mining
  minerAddress: string;
}

let config: AuditorConfig = {
  enabled:      true,
  intervalMs:   5 * 60 * 1000,
  threshold:    1,
  minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
};

interface AuditorState {
  lastRunAt:      Date | null;
  lastResult:     string;
  totalBlocksMined: number;
  totalRecordsProven: number;
  cycleCount:     number;
  status:         "idle" | "running" | "paused";
}

const state: AuditorState = {
  lastRunAt:        null,
  lastResult:       "Not yet run",
  totalBlocksMined: 0,
  totalRecordsProven: 0,
  cycleCount:       0,
  status:           "idle",
};

let timer: ReturnType<typeof setInterval> | null = null;
const SPECTRAL_API_URL = process.env.SPECTRAL_API_URL ?? "http://localhost:5001";

// ── Agent Ψ channel (fixed for blockchain_auditor) ────────────────────────────
const AGENT_PSI = { wdm: 42, oam: 7, pol: 1 };  // reserved channel for auditor

// ── Register agent in kernel ──────────────────────────────────────────────────
async function registerAgent() {
  try {
    await db.execute(drizzleSql`
      INSERT INTO wnsp_agents (agent_id, wdm, oam, pol, intent, authority_band, registered_at, updated_at)
      VALUES ('blockchain_auditor', ${AGENT_PSI.wdm}, ${AGENT_PSI.oam}, ${AGENT_PSI.pol},
              'autonomous spectral audit and proof mining', 'AUTH',
              ${Date.now() / 1000}, ${Date.now() / 1000})
      ON CONFLICT (agent_id) DO UPDATE
        SET updated_at = ${Date.now() / 1000},
            intent = 'autonomous spectral audit and proof mining'
    `);
    console.log("[AUDITOR] blockchain_auditor registered in kernel — Ψ(42,7,H) AUTH band");
  } catch (e: any) {
    console.error("[AUDITOR] Registration warning:", e.message);
  }
}

// ── Log to agent bus ──────────────────────────────────────────────────────────
async function busLog(payload: string, dst = "bus_router", priority = 3) {
  try {
    const route = `blockchain_auditor→${dst}`;
    await db.execute(drizzleSql`
      INSERT INTO wnsp_bus_log (src, dst, payload, priority, src_wdm, src_oam, src_pol,
                                dst_wdm, dst_oam, dst_pol, route, dispatched_at)
      VALUES ('blockchain_auditor', ${dst}, ${payload}, ${priority},
              ${AGENT_PSI.wdm}, ${AGENT_PSI.oam}, ${AGENT_PSI.pol},
              0, 0, 0, ${route}, ${Date.now() / 1000})
    `);
  } catch (e: any) {
    console.warn("[AUDITOR] busLog error:", e.message);
  }
}

// ── Heartbeat (runs every 60s to prevent watchdog reclaim) ────────────────────
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function heartbeat() {
  try {
    const now = Date.now() / 1000;
    await db.execute(drizzleSql`
      UPDATE wnsp_agents SET updated_at = ${now}
      WHERE agent_id = 'blockchain_auditor'
    `);
  } catch (e: any) {
    console.warn("[AUDITOR] Heartbeat error:", e.message);
  }
}

function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(heartbeat, 60_000); // every 60s
}

// ── Core: run one audit cycle ─────────────────────────────────────────────────
async function runCycle() {
  if (state.status === "running") return;
  state.status  = "running";
  state.cycleCount++;
  await heartbeat();

  try {
    // Import lazily to avoid circular deps
    const { blockchainTxPool, blockchainBlocks, spectralRecords } = await import("@shared/schema");
    const { eq, inArray, desc } = await import("drizzle-orm");
    const { sql: drizzleSql2 } = await import("drizzle-orm");

    // Count pending audit txs
    const pending = await db.select().from(blockchainTxPool)
      .where(drizzleSql2`${blockchainTxPool.status} = 'pending' AND ${blockchainTxPool.memo} LIKE 'SPECTRAL_AUDIT:%'`);

    if (pending.length < config.threshold) {
      state.lastResult = `Cycle ${state.cycleCount}: ${pending.length} pending < threshold ${config.threshold} — waiting`;
      state.lastRunAt  = new Date();
      state.status     = "idle";
      return;
    }

    // Build block content
    const blockContent = `SPECTRAL_AUDIT_BLOCK[auto]: ${pending.length} records proven at λ via Λ=hf/c² | agent: blockchain_auditor | cycle: ${state.cycleCount}`;

    // Encode through spectral engine
    const encRes = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction: blockContent, label: "audit_block" }),
    });

    if (!encRes.ok) throw new Error("Spectral encode failed");
    const enc: any = await encRes.json();

    const psiMatch = enc.psi_channel?.match(/Ψ\((\d+),\s*(\d+),\s*([HV])\)/);
    const wdm = psiMatch ? parseInt(psiMatch[1]) : 0;
    const oam = psiMatch ? parseInt(psiMatch[2]) : 0;
    const pol = psiMatch ? psiMatch[3] : "H";

    // Get latest block
    const [latest] = await db.select().from(blockchainBlocks).orderBy(desc(blockchainBlocks.blockNumber)).limit(1);
    const nextNumber = (latest?.blockNumber ?? -1) + 1;

    const txIds = pending.map((t: any) => t.id);
    const [block] = await db.insert(blockchainBlocks).values({
      blockNumber:  nextNumber,
      content:      blockContent,
      wavelengthNm: String(enc.wavelength_mid_nm ?? 550),
      psiChannel:   enc.psi_channel,
      wdm, oam, polarisation: pol,
      band:         enc.band ?? "CORE",
      energyJoules: String(enc.energy_joules ?? 0),
      lambdaMassKg: String(enc.lambda_mass_kg ?? 0),
      frequencyHz:  String(enc.frequency_hz ?? 0),
      previousPsi:  latest?.psiChannel ?? null,
      nxtReward:    "1.00000000",
      minerAddress: config.minerAddress,
      txCount:      txIds.length,
      transactions: txIds as any,
    }).returning();

    // Mark txs confirmed
    await db.update(blockchainTxPool)
      .set({ status: "confirmed" })
      .where(inArray(blockchainTxPool.id, txIds));

    // Update spectral records with proof
    for (const tx of pending) {
      const recordId = (tx as any).memo?.split(":")[1];
      if (!recordId) continue;
      try {
        const [rec] = await db.select().from(spectralRecords).where(eq(spectralRecords.id, recordId));
        if (rec) {
          const existing = (rec.data as any) ?? {};
          await db.update(spectralRecords)
            .set({ data: { ...existing, auditStatus: "confirmed", proofBlockNumber: nextNumber, proofBlockPsi: enc.psi_channel, minedByAgent: "blockchain_auditor" } })
            .where(eq(spectralRecords.id, recordId));
        }
      } catch {}
    }

    state.totalBlocksMined++;
    state.totalRecordsProven += pending.length;
    state.lastResult = `Block #${nextNumber} mined — ${pending.length} records proven at ${parseFloat(enc.wavelength_mid_nm).toFixed(2)}nm ${enc.psi_channel}`;
    state.lastRunAt  = new Date();

    await busLog(`AUDIT_COMPLETE: block_number=${nextNumber} records_proven=${pending.length} wavelength=${enc.wavelength_mid_nm}nm psi=${enc.psi_channel}`, "bus_router", 2);
    console.log(`[AUDITOR] ${state.lastResult}`);

  } catch (err: any) {
    state.lastResult = `Cycle ${state.cycleCount} error: ${err.message}`;
    await busLog(`AUDIT_ERROR: ${err.message}`, "bus_router", 1);
    console.error("[AUDITOR] Cycle error:", err.message);
  } finally {
    state.status = "idle";
  }
}

// ── Start / stop ──────────────────────────────────────────────────────────────
function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => { if (config.enabled) runCycle(); }, config.intervalMs);
  console.log(`[AUDITOR] Running every ${config.intervalMs / 1000}s, threshold=${config.threshold} txs`);
}

export async function startBlockchainAuditor() {
  await registerAgent();
  await heartbeat(); // immediate heartbeat to set updated_at
  startHeartbeat(); // keep alive every 60s (watchdog TTL is typically 300s)
  await busLog("AGENT_BOOT: blockchain_auditor online — autonomous spectral audit + ecosystem monitor active", "bus_router", 2);
  startTimer();
  // Run first cycle after 30s to let the server settle
  setTimeout(() => { if (config.enabled) runCycle(); }, 30_000);
}

// ── Public API ────────────────────────────────────────────────────────────────
export function getAuditorStatus() {
  return { config: { ...config }, state: { ...state } };
}

export function updateAuditorConfig(patch: Partial<AuditorConfig>) {
  Object.assign(config, patch);
  if (patch.intervalMs || patch.enabled !== undefined) {
    if (config.enabled) {
      startTimer();
    } else {
      if (timer) clearInterval(timer);
      state.status = "paused";
      busLog("AGENT_PAUSE: blockchain_auditor paused by operator", "bus_router", 3);
    }
  }
}

export async function triggerAuditCycle() {
  await runCycle();
  return state.lastResult;
}
