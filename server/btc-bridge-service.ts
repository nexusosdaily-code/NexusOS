/**
 * BTC Bridge Service — NexusOS → Bitcoin Ordinals
 * Full automation: watches NexusOS events, queues inscriptions,
 * and processes the queue automatically using the service wallet.
 */

// ── WASCII encoder (server-side) ─────────────────────────────────────────────
const WASCII_TABLE: Record<string, number> = {
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(65 + i), 380 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(97 + i), 383 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), 536 + i * 6])),
  " ": 596, ".": 602, ",": 608, "!": 614, "?": 620, ":": 626, ";": 632,
  "-": 638, "_": 644, "/": 650, "@": 662, "#": 668, "$": 674, "=": 752,
};
function wNm(ch: string): number { return WASCII_TABLE[ch] ?? (380 + (ch.charCodeAt(0) % 256) / 255 * 400); }
function wBand(nm: number): string {
  if (nm < 450) return "SYSTEM"; if (nm < 490) return "KERNEL"; if (nm < 520) return "STREAM";
  if (nm < 565) return "CORE";   if (nm < 590) return "UI";     if (nm < 625) return "EVENT";
  return "STORAGE";
}
export function wasciiEncodeText(text: string): { meanNm: number; wdm: number; oam: number; pol: string; psi: string; band: string } {
  const chars = Array.from(text), nms = chars.map(c => wNm(c));
  const meanNm = nms.reduce((a, b) => a + b, 0) / nms.length;
  const sumCode = chars.reduce((s, c) => s + c.charCodeAt(0), 0);
  return { meanNm, wdm: Math.floor((meanNm - 380) / 4) + 1, oam: sumCode % 100, pol: chars.length % 2 === 0 ? "H" : "V", psi: `Ψ(${Math.floor((meanNm - 380) / 4) + 1},${sumCode % 100},${chars.length % 2 === 0 ? "H" : "V"})`, band: wBand(meanNm) };
}

// ── Inscription content builder ──────────────────────────────────────────────
const SEP = "═".repeat(63), SEP2 = "─".repeat(63);
export interface BridgeEvent {
  type: "NXT_TRANSFER" | "GOVERNANCE" | "KERNEL" | "WASCII_MANUAL" | "ORDINAL_DEPOSIT";
  ref: string; data: Record<string, string | number | null>; triggeredBy: string;
}
export function buildInscriptionContent(event: BridgeEvent, anchorPsi = "Ψ(27,56,H)"): string {
  const ts = new Date().toISOString(), enc = wasciiEncodeText(event.type);
  const lines = [
    "WASCII-v2.0 NEXUSOS EVENT INSCRIPTION",
    "Wavelength Network Spectral Protocol — Bitcoin Audit Layer",
    `Anchor: wnsp.sats | ${anchorPsi} | KERNEL band`,
    `AGPL-3.0 | https://wnsp.io | ${ts.split("T")[0]}`,
    SEP, `EVENT   : ${event.type}`, `REF     : ${event.ref}`,
    `TRIGGER : ${event.triggeredBy}`, `TIME    : ${ts}`, SEP, "EVENT DATA", SEP2,
  ];
  Object.entries(event.data).forEach(([k, v]) => { if (v !== null && v !== undefined) lines.push(`${k.padEnd(14)}: ${v}`); });
  lines.push(SEP, "SPECTRAL FINGERPRINT (WASCII-v2.0)", SEP2);
  Array.from(event.type).forEach((ch, i) => {
    const nm = wNm(ch); lines.push(`${ch.padEnd(4)} → ${nm.toFixed(2)}nm   ${wBand(nm)}`);
  });
  lines.push(SEP2, `MEAN λ  : ${enc.meanNm.toFixed(4)} nm`, `Ψ       : ${enc.psi}`, `BAND    : ${enc.band}`,
    `WNSP URI: wnsp://${enc.psi}/${event.type.toLowerCase().replace(/_/g, "-")}`,
    SEP, "CHAIN ANCHOR", SEP2,
    "Parent  : wnsp.sats (Sats Names Protocol · Bitcoin)",
    `Anchor Ψ: ${anchorPsi}`, "Protocol: NexusOS WNSP-CE v1.0 / WNSP-SE v1.0",
    "Network : Bitcoin (Taproot · Ordinals)", SEP,
    "This inscription is a permanent audit record of a NexusOS",
    "blockchain event, anchored to wnsp.sats on Bitcoin.",
    "The physics cannot be altered. The record cannot be burned.",
    SEP, "SOURCE  : https://wnsp.io", "LICENSE : AGPL-3.0");
  return lines.join("\n");
}

// ── Auto-processor state ──────────────────────────────────────────────────────
export interface ProcessorStatus {
  running: boolean;
  enabled: boolean;
  walletConfigured: boolean;
  totalProcessed: number;
  totalFailed: number;
  lastInscriptionId: string | null;
  lastInscriptionTime: string | null;
  lastError: string | null;
  lastErrorTime: string | null;
  queueDepth: number;
  intervalMs: number;
  minBalanceSats: number;
}

// ── BtcBridgeService ──────────────────────────────────────────────────────────
export class BtcBridgeService {
  private anchorName = "wnsp.sats";
  private anchorPsi  = "Ψ(27,56,H)";
  private anchorAddress: string | null = null;
  private parentInscriptionId: string | null = null;

  // Auto-processor state
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _enabled  = true;          // can be toggled via API
  private _busy     = false;         // prevents overlapping runs
  private _totalProcessed = 0;
  private _totalFailed    = 0;
  private _lastInscriptionId:   string | null = null;
  private _lastInscriptionTime: string | null = null;
  private _lastError:     string | null = null;
  private _lastErrorTime: string | null = null;
  private _queueDepth = 0;
  readonly intervalMs = 30_000;      // check every 30 seconds
  readonly minBalanceSats = 5_000;   // ~$5 minimum before pausing

  setAnchor(address: string | null, parentId: string | null) {
    this.anchorAddress = address;
    this.parentInscriptionId = parentId;
  }

  setEnabled(enabled: boolean) { this._enabled = enabled; }

  getStatus(): ProcessorStatus {
    return {
      running:             !!this._timer,
      enabled:             this._enabled,
      walletConfigured:    !!process.env.BTC_INSCRIPTION_WALLET_WIF,
      totalProcessed:      this._totalProcessed,
      totalFailed:         this._totalFailed,
      lastInscriptionId:   this._lastInscriptionId,
      lastInscriptionTime: this._lastInscriptionTime,
      lastError:           this._lastError,
      lastErrorTime:       this._lastErrorTime,
      queueDepth:          this._queueDepth,
      intervalMs:          this.intervalMs,
      minBalanceSats:      this.minBalanceSats,
    };
  }

  // ── Queue management ────────────────────────────────────────────────────────
  async queueEvent(event: BridgeEvent): Promise<{ id: number; content: string; psi: string }> {
    const { db } = await import("./db");
    const { btcInscriptionQueue } = await import("../shared/schema");
    const content = buildInscriptionContent(event, this.anchorPsi);
    const enc = wasciiEncodeText(event.type);
    const [row] = await db.insert(btcInscriptionQueue).values({
      eventType: event.type, eventRef: event.ref, anchorName: this.anchorName,
      anchorAddress: this.anchorAddress, parentInscriptionId: this.parentInscriptionId,
      inscriptionContent: content, contentBytes: new TextEncoder().encode(content).length,
      psiChannel: enc.psi, status: "pending", triggeredBy: event.triggeredBy,
    }).returning();
    this._queueDepth++;
    console.log(`[BTC Bridge] Queued ${event.type} #${row.id} (${enc.psi})`);
    return { id: row.id, content, psi: enc.psi };
  }

  async getQueue(status?: string) {
    const { db } = await import("./db");
    const { btcInscriptionQueue } = await import("../shared/schema");
    const { desc, eq } = await import("drizzle-orm");
    if (status) return db.select().from(btcInscriptionQueue).where(eq(btcInscriptionQueue.status, status)).orderBy(desc(btcInscriptionQueue.createdAt));
    return db.select().from(btcInscriptionQueue).orderBy(desc(btcInscriptionQueue.createdAt));
  }

  // ── Auto-processor core ─────────────────────────────────────────────────────
  startAutoProcessor() {
    if (this._timer) return; // already running
    console.log(`[BTC Bridge] Auto-processor started — checking every ${this.intervalMs / 1000}s`);
    this._timer = setInterval(() => this._processCycle(), this.intervalMs);
    // Run immediately on start
    setTimeout(() => this._processCycle(), 2000);
  }

  stopAutoProcessor() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    console.log("[BTC Bridge] Auto-processor stopped");
  }

  private async _processCycle() {
    if (this._busy || !this._enabled) return;
    this._busy = true;
    try {
      const { getServiceWallet, getWalletBalance, inscribeText } = await import("./btc-inscription-engine");
      const wallet = getServiceWallet();
      if (!wallet) { this._busy = false; return; } // no key configured

      // Check balance
      let balance: { confirmed: number } | null = null;
      try { balance = await getWalletBalance(wallet.address); } catch { this._busy = false; return; }
      if (!balance || balance.confirmed < this.minBalanceSats) {
        if (balance) console.log(`[BTC Bridge] Low balance: ${balance.confirmed} sats — pausing`);
        this._busy = false; return;
      }

      // Get oldest pending item
      const { db } = await import("./db");
      const { btcInscriptionQueue } = await import("../shared/schema");
      const { eq, asc } = await import("drizzle-orm");
      const [item] = await db.select().from(btcInscriptionQueue)
        .where(eq(btcInscriptionQueue.status, "pending"))
        .orderBy(asc(btcInscriptionQueue.createdAt))
        .limit(1);

      // Update queue depth
      const pending = await db.select().from(btcInscriptionQueue).where(eq(btcInscriptionQueue.status, "pending"));
      this._queueDepth = pending.length;

      if (!item) { this._busy = false; return; }

      console.log(`[BTC Bridge] Auto-inscribing queue item #${item.id} (${item.eventType})`);

      // Mark as signed (in-progress)
      await db.update(btcInscriptionQueue).set({ status: "signed", signedAt: new Date() }).where(eq(btcInscriptionQueue.id, item.id));

      try {
        const result = await inscribeText(item.inscriptionContent, {
          parentInscriptionId: item.parentInscriptionId ?? undefined,
        });

        await db.update(btcInscriptionQueue).set({
          status: "confirmed",
          inscriptionId: result.inscriptionId,
          confirmedAt: new Date(),
        }).where(eq(btcInscriptionQueue.id, item.id));

        this._totalProcessed++;
        this._lastInscriptionId   = result.inscriptionId;
        this._lastInscriptionTime = new Date().toISOString();
        this._queueDepth          = Math.max(0, this._queueDepth - 1);
        console.log(`[BTC Bridge] ✓ Inscribed #${item.id} → ${result.inscriptionId} (fee: ${result.feeSats} sats)`);
      } catch (inscribeErr: any) {
        // Roll back to pending so it can be retried
        await db.update(btcInscriptionQueue).set({ status: "pending" }).where(eq(btcInscriptionQueue.id, item.id));
        this._totalFailed++;
        this._lastError     = inscribeErr.message;
        this._lastErrorTime = new Date().toISOString();
        console.error(`[BTC Bridge] ✗ Inscription failed for #${item.id}:`, inscribeErr.message);
      }
    } catch (err: any) {
      this._lastError     = err.message;
      this._lastErrorTime = new Date().toISOString();
      console.error("[BTC Bridge] Processor cycle error:", err.message);
    } finally {
      this._busy = false;
    }
  }

  // ── Event trigger helpers ───────────────────────────────────────────────────
  async triggerFromTransaction(tx: {
    id: string; type: string; amount: string; fromWalletId?: string;
    toWalletId?: string; wavelength?: string; frequency?: string;
    status: string; triggeredBy?: string;
  }) {
    const amountNxt = parseFloat(tx.amount) / 1e8;
    if (amountNxt < 100) return null;
    return this.queueEvent({
      type: "NXT_TRANSFER", ref: tx.id, triggeredBy: tx.triggeredBy ?? "system",
      data: {
        tx_type: tx.type, amount_nxt: amountNxt.toFixed(8),
        from: tx.fromWalletId ?? "system", to: tx.toWalletId ?? "system",
        wavelength: tx.wavelength ? `${parseFloat(tx.wavelength).toFixed(4)} nm` : null,
        frequency:  tx.frequency  ? `${(parseFloat(tx.frequency) / 1e12).toFixed(6)} THz` : null,
        status: tx.status,
      },
    });
  }

  async triggerFromGovernance(proposal: { id: number; title: string; status: string; executor?: string }) {
    return this.queueEvent({
      type: "GOVERNANCE", ref: `proposal-${proposal.id}`, triggeredBy: proposal.executor ?? "kernel",
      data: { proposal_id: proposal.id, title: proposal.title, status: proposal.status, executed_by: proposal.executor ?? "kernel" },
    });
  }

  async triggerFromKernel(event: { type: string; ref: string; data: Record<string, any> }) {
    return this.queueEvent({
      type: "KERNEL", ref: event.ref, triggeredBy: "kernel",
      data: event.data,
    });
  }
}

export const btcBridge = new BtcBridgeService();
