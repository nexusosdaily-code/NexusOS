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
export type BridgeEventType =
  // ── Tokenomics
  | "NXT_TRANSFER"        // peer transfer ≥100 NXT
  | "NXT_BURN"            // protocol fee burn
  | "NXT_EMISSION"        // new token emission / genesis
  // ── Governance & Kernel
  | "GOVERNANCE"          // proposal executed
  | "PROTOCOL_UPDATE"     // live parameter changed
  | "KERNEL"              // kernel event (boot, watchdog, agent)
  | "AGENT_ACTION"        // AI agent significant action
  // ── Spectral / Physics
  | "SPECTRAL_RECORD"     // spectral DB record saved
  | "WASCII_ENCODE"       // WASCII encoding anchored
  | "WASCII_MANUAL"       // manual inscription
  | "CHANNEL_OPEN"        // new Ψ channel registered
  // ── Network & Identity
  | "NODE_REGISTER"       // spectral node joined network
  | "CONTRACT_SIGN"       // physics-signed contract
  | "ORDINAL_DEPOSIT"     // ordinal deposited to treasury
  // ── Campaigns
  | "CAMPAIGN_LAUNCH"     // campaign started
  | "CAMPAIGN_MILESTONE"  // campaign milestone reached
  // ── BRC-20 (raw JSON inscriptions — no WASCII wrapper)
  | "BRC20_DEPLOY"        // deploy a BRC-20 token
  | "BRC20_MINT"          // mint BRC-20 tokens
  | "RUNE_ETCH"           // etch (create) a new Rune linked to a WNSP spectral channel
  | "RUNE_MINT"           // mint units of an existing Rune
  | "RUNE_TRANSFER"       // transfer Rune balance
  | "BRC20_TRANSFER";     // transfer BRC-20 tokens

export interface BridgeEvent {
  type: BridgeEventType;
  ref: string; data: Record<string, string | number | null>; triggeredBy: string;
}
export function buildInscriptionContent(event: BridgeEvent, anchorPsi = "Ψ(27,56,H)"): string {
  const ts = new Date().toISOString(), enc = wasciiEncodeText(event.type);
  const lines = [
    "WASCII-v2.0 NEXUSOS EVENT INSCRIPTION",
    "Wavelength Network Spectral Protocol (WNSP) — Bitcoin Audit Layer",
    `Platform : wnsp.tech  |  Organization: wnsp.io`,
    `Anchor   : wnsp.sats · wnsp.sat  |  ${anchorPsi}  |  KERNEL band`,
    `Names    : wnsp.btc (BNS) · wnsp.unisat (UniSat) · wnsp.sats · wnsp.sat  |  AGPL-3.0  |  ${ts.split("T")[0]}`,
    SEP, `EVENT   : ${event.type}`, `REF     : ${event.ref}`,
    `TRIGGER : ${event.triggeredBy}`, `TIME    : ${ts}`, SEP, "EVENT DATA", SEP2,
  ];
  Object.entries(event.data).forEach(([k, v]) => { if (v !== null && v !== undefined) lines.push(`${k.padEnd(14)}: ${v}`); });
  lines.push(SEP, "SPECTRAL FINGERPRINT (WASCII-v2.0)", SEP2);
  Array.from(event.type).forEach((ch) => {
    const nm = wNm(ch); lines.push(`${ch.padEnd(4)} → ${nm.toFixed(2)}nm   ${wBand(nm)}`);
  });
  lines.push(SEP2, `MEAN λ  : ${enc.meanNm.toFixed(4)} nm`, `Ψ       : ${enc.psi}`, `BAND    : ${enc.band}`,
    `WNSP URI: wnsp://${enc.psi}/${event.type.toLowerCase().replace(/_/g, "-")}`,
    SEP, "CHAIN ANCHOR", SEP2,
    "Parent  : wnsp.sats / wnsp.sat (Sats Names Protocol · Bitcoin)",
    "BTC Name: wnsp.btc  (Bitcoin Name System · BNS)",
    "UniSat  : wnsp.unisat (UniSat Name Service)",
    `Anchor Ψ: ${anchorPsi}`,
    "Protocol: WNSP-CE v1.0 / WNSP-SE v1.0 / WASCII-v2.0",
    "Network : Bitcoin (Taproot · Ordinals)", SEP,
    "This inscription is a permanent audit record of a NexusOS",
    "blockchain event. Developed at wnsp.tech, governed by wnsp.io.",
    "The physics cannot be altered. The record cannot be burned.",
    SEP,
    "PLATFORM: https://wnsp.tech",
    "ORG     : https://wnsp.io",
    "LICENSE : AGPL-3.0");
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
  private anchorName = "wnsp.sats";      // Sats Names Protocol anchor
  private anchorPsi  = "Ψ(27,56,H)";    // KERNEL band, 485nm
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

  // Backoff map: itemId → earliest next retry timestamp (ms)
  private _backoff = new Map<number, number>();
  private _backoffBase = 60_000;     // 1 min initial backoff
  private _backoffMax  = 3_600_000;  // 1 hour cap
  private _backoffCount = new Map<number, number>(); // itemId → fail count

  // ── Persistent anchor (survives restarts) ──────────────────────────────────
  async saveAnchor(address: string | null, parentId: string | null) {
    this.anchorAddress = address;
    this.parentInscriptionId = parentId;
    try {
      const { db } = await import("./db");
      const { btcBridgeConfig } = await import("../shared/schema");
      // Ensure table exists
      await db.execute(`CREATE TABLE IF NOT EXISTS btc_bridge_config (
        key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )` as any);
      // Upsert both values
      const upsert = async (k: string, v: string | null) =>
        db.execute(`INSERT INTO btc_bridge_config (key, value, updated_at)
          VALUES ('${k}', ${v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()` as any);
      await upsert("anchor_address",          address);
      await upsert("parent_inscription_id",   parentId);
      console.log(`[BTC Bridge] Anchor saved → address=${address ?? "null"} parent=${parentId ?? "null"}`);
    } catch (e: any) {
      console.error("[BTC Bridge] Failed to persist anchor:", e.message);
    }
  }

  async loadAnchor() {
    try {
      const { db } = await import("./db");
      await db.execute(`CREATE TABLE IF NOT EXISTS btc_bridge_config (
        key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )` as any);
      const rows = await db.execute(`SELECT key, value FROM btc_bridge_config WHERE key IN ('anchor_address','parent_inscription_id')` as any);
      const map: Record<string, string | null> = {};
      for (const r of (rows as any).rows ?? []) map[r.key] = r.value ?? null;
      this.anchorAddress       = map["anchor_address"]        ?? null;
      this.parentInscriptionId = map["parent_inscription_id"] ?? null;
      if (this.anchorAddress || this.parentInscriptionId) {
        console.log(`[BTC Bridge] Anchor loaded → address=${this.anchorAddress ?? "null"} parent=${this.parentInscriptionId ?? "null"}`);
      }
    } catch (e: any) {
      console.error("[BTC Bridge] Failed to load anchor:", e.message);
    }
  }

  getAnchor() {
    return { address: this.anchorAddress, parentInscriptionId: this.parentInscriptionId };
  }

  // In-memory only (legacy, kept for compat)
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

  // ── Raw content queue (bypasses WASCII template — used for BRC-20 JSON) ────
  async queueRawContent(opts: {
    eventType: string; ref: string; content: string;
    triggeredBy: string; psiChannel?: string;
  }): Promise<{ id: number; content: string; psi: string }> {
    const { db } = await import("./db");
    const { btcInscriptionQueue } = await import("../shared/schema");
    const enc = wasciiEncodeText(opts.eventType);
    const psi = opts.psiChannel ?? enc.psi;
    const [row] = await db.insert(btcInscriptionQueue).values({
      eventType:          opts.eventType,
      eventRef:           opts.ref,
      anchorName:         this.anchorName,
      anchorAddress:      this.anchorAddress,
      parentInscriptionId: this.parentInscriptionId,
      inscriptionContent: opts.content,
      contentBytes:       new TextEncoder().encode(opts.content).length,
      psiChannel:         psi,
      status:             "pending",
      triggeredBy:        opts.triggeredBy,
    }).returning();
    this._queueDepth++;
    console.log(`[BTC Bridge] Queued ${opts.eventType} #${row.id} (raw, ${opts.content.length} chars)`);
    return { id: row.id, content: opts.content, psi };
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
    // Load persisted anchor config before first cycle
    this.loadAnchor().catch(() => {});
    this._timer = setInterval(() => this._processCycle(), this.intervalMs);
    // Run first cycle shortly after anchor loads
    setTimeout(() => this._processCycle(), 4000);
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

      // Check CONFIRMED balance only — unconfirmed UTXOs cannot fund new txs reliably
      let balance: { confirmed: number; unconfirmed: number; total: number } | null = null;
      try { balance = await getWalletBalance(wallet.address); } catch { this._busy = false; return; }
      if (!balance) { this._busy = false; return; }

      if (balance.confirmed < this.minBalanceSats) {
        console.log(`[BTC Bridge] Waiting for confirmations — ${balance.confirmed} confirmed / ${balance.unconfirmed} unconfirmed sats (need ${this.minBalanceSats} confirmed)`);
        this._busy = false; return;
      }

      // Get oldest pending item that is not in backoff
      const { db } = await import("./db");
      const { btcInscriptionQueue } = await import("../shared/schema");
      const { eq, asc } = await import("drizzle-orm");

      const allPending = await db.select().from(btcInscriptionQueue)
        .where(eq(btcInscriptionQueue.status, "pending"))
        .orderBy(asc(btcInscriptionQueue.createdAt));

      this._queueDepth = allPending.length;

      const now = Date.now();
      const item = allPending.find(i => {
        const nextRetry = this._backoff.get(i.id) ?? 0;
        return now >= nextRetry;
      });

      if (!item) {
        const next = Math.min(...[...this._backoff.values()].filter(t => t > now));
        const waitSec = isFinite(next) ? Math.round((next - now) / 1000) : 0;
        if (waitSec > 0) console.log(`[BTC Bridge] All pending items in backoff — next retry in ${waitSec}s`);
        this._busy = false; return;
      }

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

        // Clear backoff on success
        this._backoff.delete(item.id);
        this._backoffCount.delete(item.id);
        this._totalProcessed++;
        this._lastInscriptionId   = result.inscriptionId;
        this._lastInscriptionTime = new Date().toISOString();
        this._queueDepth          = Math.max(0, this._queueDepth - 1);
        console.log(`[BTC Bridge] ✓ Inscribed #${item.id} → ${result.inscriptionId} (fee: ${result.feeSats} sats)`);
      } catch (inscribeErr: any) {
        // Roll back to pending with exponential backoff — do NOT immediately re-queue
        await db.update(btcInscriptionQueue).set({ status: "pending" }).where(eq(btcInscriptionQueue.id, item.id));
        const failCount = (this._backoffCount.get(item.id) ?? 0) + 1;
        this._backoffCount.set(item.id, failCount);
        const delay = Math.min(this._backoffBase * Math.pow(2, failCount - 1), this._backoffMax);
        this._backoff.set(item.id, Date.now() + delay);
        this._totalFailed++;
        this._lastError     = inscribeErr.message;
        this._lastErrorTime = new Date().toISOString();
        const retryIn = Math.round(delay / 1000);
        console.error(`[BTC Bridge] ✗ Inscription failed for #${item.id} (attempt ${failCount}): ${inscribeErr.message} — retry in ${retryIn}s`);
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

  async triggerFromBurn(burn: {
    id: string; amountNxt: string; fromWalletAddress: string;
    reason: string; wavelength?: string; triggeredBy?: string;
  }) {
    const amt = parseFloat(burn.amountNxt);
    if (amt < 1) return null; // only inscribe meaningful treasury deposits
    return this.queueEvent({
      type: "NXT_BURN", ref: `burn-${burn.id}`, triggeredBy: burn.triggeredBy ?? "protocol",
      data: {
        amount_nxt:    amt.toFixed(8),
        from_wallet:   burn.fromWalletAddress,
        reason:        burn.reason,
        wavelength:    burn.wavelength ? `${parseFloat(burn.wavelength).toFixed(4)} nm` : null,
        destination:   "Orbital Treasury (wnsp.io)",
        settlement:    "NXT held in orbital treasury — not destroyed",
        treasury_org:  "wnsp.io",
        platform:      "wnsp.tech",
      },
    });
  }

  async triggerFromSpectralRecord(rec: {
    id: number; label: string; psiChannel: string; band: string;
    wavelengthNm: string; contentHash: string; walletAddress?: string; triggeredBy?: string;
  }) {
    return this.queueEvent({
      type: "SPECTRAL_RECORD", ref: `spectral-${rec.id}`, triggeredBy: rec.triggeredBy ?? "system",
      data: {
        record_id:     rec.id,
        label:         rec.label,
        psi_channel:   rec.psiChannel,
        band:          rec.band,
        wavelength:    `${parseFloat(rec.wavelengthNm).toFixed(4)} nm`,
        content_hash:  rec.contentHash,
        wallet:        rec.walletAddress ?? null,
        layer:         "NexusOS Spectral Database",
      },
    });
  }

  async triggerFromAgentAction(agent: {
    agentId: string; agentName: string; action: string;
    psiChannel?: string; walletAddress?: string; data?: Record<string, any>;
  }) {
    return this.queueEvent({
      type: "AGENT_ACTION", ref: `agent-${agent.agentId}-${Date.now()}`, triggeredBy: agent.agentName,
      data: {
        agent_id:    agent.agentId,
        agent_name:  agent.agentName,
        action:      agent.action,
        psi_channel: agent.psiChannel ?? null,
        wallet:      agent.walletAddress ?? null,
        layer:       "NexusOS AI Kernel",
        ...(agent.data ?? {}),
      },
    });
  }

  async triggerFromNodeRegister(node: {
    nodeId: string; psiChannel: string; band: string;
    wavelengthNm: string; walletAddress?: string; triggeredBy?: string;
  }) {
    return this.queueEvent({
      type: "NODE_REGISTER", ref: `node-${node.nodeId}`, triggeredBy: node.triggeredBy ?? "network",
      data: {
        node_id:    node.nodeId,
        psi_channel: node.psiChannel,
        band:       node.band,
        wavelength: `${parseFloat(node.wavelengthNm).toFixed(4)} nm`,
        wallet:     node.walletAddress ?? null,
        network:    "WNSP Spectral Mesh",
      },
    });
  }

  async triggerFromCampaign(campaign: {
    id: string; name: string; type: "CAMPAIGN_LAUNCH" | "CAMPAIGN_MILESTONE";
    milestone?: string; walletAddress?: string; triggeredBy?: string;
  }) {
    return this.queueEvent({
      type: campaign.type, ref: `campaign-${campaign.id}`, triggeredBy: campaign.triggeredBy ?? "wnsp.io",
      data: {
        campaign_id:   campaign.id,
        campaign_name: campaign.name,
        milestone:     campaign.milestone ?? null,
        wallet:        campaign.walletAddress ?? null,
        platform:      "wnsp.tech",
        org:           "wnsp.io",
      },
    });
  }

  async triggerFromContractSign(contract: {
    id: string; title: string; signerWallet: string;
    contentHash: string; wavelength?: string; triggeredBy?: string;
  }) {
    return this.queueEvent({
      type: "CONTRACT_SIGN", ref: `contract-${contract.id}`, triggeredBy: contract.triggeredBy ?? contract.signerWallet,
      data: {
        contract_id:   contract.id,
        title:         contract.title,
        signer_wallet: contract.signerWallet,
        content_hash:  contract.contentHash,
        wavelength:    contract.wavelength ? `${parseFloat(contract.wavelength).toFixed(4)} nm` : null,
        algorithm:     "SHA-256(content) ⊕ hex(λ_signer)",
        layer:         "NexusOS Physics-Signed Contracts",
      },
    });
  }
}

export const btcBridge = new BtcBridgeService();
