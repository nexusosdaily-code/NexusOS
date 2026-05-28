/**
 * BTC Bridge Service — NexusOS → Bitcoin Ordinals
 * Watches NexusOS events and builds WASCII inscription content
 * linked to wnsp.sats as the anchor identity.
 *
 * Two modes:
 *   MANUAL — user clicks "Sign on Unisat" for each queued inscription
 *   AUTO   — server wallet signs automatically (requires BTC + private key)
 */

// ── WASCII encoder (server-side, matches frontend) ──────────────────────────
const WASCII_TABLE: Record<string, number> = {
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(65 + i), 380 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(97 + i), 383 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), 536 + i * 6])),
  " ": 596, ".": 602, ",": 608, "!": 614, "?": 620, ":": 626, ";": 632,
  "-": 638, "_": 644, "/": 650, "@": 662, "#": 668, "$": 674, "=": 752,
};

function wNm(ch: string): number {
  return WASCII_TABLE[ch] ?? (380 + (ch.charCodeAt(0) % 256) / 255 * 400);
}

function wBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 490) return "KERNEL";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "CORE";
  if (nm < 590) return "UI";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}

export function wasciiEncodeText(text: string): { meanNm: number; wdm: number; oam: number; pol: string; psi: string; band: string } {
  const chars = Array.from(text);
  const nms = chars.map(c => wNm(c));
  const meanNm = nms.reduce((a, b) => a + b, 0) / nms.length;
  const sumCode = chars.reduce((s, c) => s + c.charCodeAt(0), 0);
  const wdm = Math.floor((meanNm - 380) / 4) + 1;
  const oam = sumCode % 100;
  const pol = chars.length % 2 === 0 ? "H" : "V";
  return { meanNm, wdm, oam, pol, psi: `Ψ(${wdm},${oam},${pol})`, band: wBand(meanNm) };
}

// ── Inscription content builder ──────────────────────────────────────────────
const SEP  = "═".repeat(63);
const SEP2 = "─".repeat(63);

export interface BridgeEvent {
  type: "NXT_TRANSFER" | "GOVERNANCE" | "KERNEL" | "WASCII_MANUAL" | "ORDINAL_DEPOSIT";
  ref:  string;
  data: Record<string, string | number | null>;
  triggeredBy: string;
}

export function buildInscriptionContent(event: BridgeEvent, anchorPsi: string = "Ψ(27,56,H)"): string {
  const timestamp = new Date().toISOString();
  const eventEnc = wasciiEncodeText(event.type);
  const lines: string[] = [
    "WASCII-v2.0 NEXUSOS EVENT INSCRIPTION",
    "Wavelength Network Spectral Protocol — Bitcoin Audit Layer",
    `Anchor: wnsp.sats | ${anchorPsi} | KERNEL band`,
    `AGPL-3.0 | https://wnsp.io | ${timestamp.split("T")[0]}`,
    SEP,
    `EVENT   : ${event.type}`,
    `REF     : ${event.ref}`,
    `TRIGGER : ${event.triggeredBy}`,
    `TIME    : ${timestamp}`,
    SEP,
    "EVENT DATA",
    SEP2,
  ];

  Object.entries(event.data).forEach(([k, v]) => {
    if (v !== null && v !== undefined) {
      lines.push(`${k.padEnd(14)}: ${v}`);
    }
  });

  lines.push(SEP);
  lines.push("SPECTRAL FINGERPRINT (WASCII-v2.0)");
  lines.push(SEP2);

  // Encode event type characters
  const chars = Array.from(event.type);
  const nms = chars.map(c => wNm(c));
  chars.forEach((ch, i) => {
    lines.push(`${ch.padEnd(4)} → ${nms[i].toFixed(2)}nm   ${wBand(nms[i])}`);
  });

  lines.push(SEP2);
  lines.push(`MEAN λ  : ${eventEnc.meanNm.toFixed(4)} nm`);
  lines.push(`Ψ       : ${eventEnc.psi}`);
  lines.push(`BAND    : ${eventEnc.band}`);
  lines.push(`WNSP URI: wnsp://${eventEnc.psi}/${event.type.toLowerCase().replace(/_/g, "-")}`);
  lines.push(SEP);
  lines.push("CHAIN ANCHOR");
  lines.push(SEP2);
  lines.push("Parent  : wnsp.sats (Sats Names Protocol · Bitcoin)");
  lines.push(`Anchor Ψ: ${anchorPsi}`);
  lines.push("Protocol: NexusOS WNSP-CE v1.0 / WNSP-SE v1.0");
  lines.push("Network : Bitcoin (Taproot · Ordinals)");
  lines.push(SEP);
  lines.push("This inscription is a permanent audit record of a NexusOS");
  lines.push("blockchain event, anchored to wnsp.sats on Bitcoin.");
  lines.push("The physics cannot be altered. The record cannot be burned.");
  lines.push(SEP);
  lines.push("SOURCE  : https://wnsp.io");
  lines.push("LICENSE : AGPL-3.0");

  return lines.join("\n");
}

// ── Queue manager ────────────────────────────────────────────────────────────
export class BtcBridgeService {
  private anchorName = "wnsp.sats";
  private anchorPsi  = "Ψ(27,56,H)";      // derived from "wnsp.sats" via WASCII
  private anchorAddress: string | null = null;
  private parentInscriptionId: string | null = null;

  setAnchor(address: string | null, parentId: string | null) {
    this.anchorAddress = address;
    this.parentInscriptionId = parentId;
  }

  async queueEvent(event: BridgeEvent): Promise<{ id: number; content: string; psi: string }> {
    const { db } = await import("./db");
    const { btcInscriptionQueue } = await import("../shared/schema");

    const content = buildInscriptionContent(event, this.anchorPsi);
    const enc = wasciiEncodeText(event.type);
    const contentBytes = new TextEncoder().encode(content).length;

    const [row] = await db.insert(btcInscriptionQueue).values({
      eventType: event.type,
      eventRef: event.ref,
      anchorName: this.anchorName,
      anchorAddress: this.anchorAddress,
      parentInscriptionId: this.parentInscriptionId,
      inscriptionContent: content,
      contentBytes,
      psiChannel: enc.psi,
      status: "pending",
      triggeredBy: event.triggeredBy,
    }).returning();

    return { id: row.id, content, psi: enc.psi };
  }

  async markSigned(id: number, inscriptionId?: string) {
    const { db } = await import("./db");
    const { btcInscriptionQueue } = await import("../shared/schema");
    await db.update(btcInscriptionQueue)
      .set({ status: inscriptionId ? "confirmed" : "signed", inscriptionId: inscriptionId ?? null, signedAt: new Date(), confirmedAt: inscriptionId ? new Date() : null })
      .where((await import("drizzle-orm")).eq(btcInscriptionQueue.id, id));
  }

  async getQueue(status?: string) {
    const { db } = await import("./db");
    const { btcInscriptionQueue } = await import("../shared/schema");
    const { desc, eq } = await import("drizzle-orm");
    const query = db.select().from(btcInscriptionQueue).orderBy(desc(btcInscriptionQueue.createdAt));
    if (status) {
      return await db.select().from(btcInscriptionQueue)
        .where(eq(btcInscriptionQueue.status, status))
        .orderBy(desc(btcInscriptionQueue.createdAt));
    }
    return await query;
  }

  // Auto-trigger: watch for NXT transfers above threshold and queue them
  async triggerFromTransaction(tx: {
    id: string; type: string; amount: string; fromWalletId?: string;
    toWalletId?: string; wavelength?: string; frequency?: string;
    status: string; triggeredBy?: string;
  }) {
    const amountNxt = parseFloat(tx.amount) / 1e8;
    if (amountNxt < 100) return null; // Only inscribe transfers ≥ 100 NXT

    return this.queueEvent({
      type: "NXT_TRANSFER",
      ref: tx.id,
      triggeredBy: tx.triggeredBy ?? "system",
      data: {
        tx_type:    tx.type,
        amount_nxt: amountNxt.toFixed(8),
        from:       tx.fromWalletId ?? "system",
        to:         tx.toWalletId ?? "system",
        wavelength: tx.wavelength ? `${parseFloat(tx.wavelength).toFixed(4)} nm` : null,
        frequency:  tx.frequency ? `${(parseFloat(tx.frequency) / 1e12).toFixed(6)} THz` : null,
        status:     tx.status,
      },
    });
  }

  async triggerFromGovernance(proposal: {
    id: number; title: string; status: string; executor?: string;
  }) {
    return this.queueEvent({
      type: "GOVERNANCE",
      ref: `proposal-${proposal.id}`,
      triggeredBy: proposal.executor ?? "kernel",
      data: {
        proposal_id: proposal.id,
        title:       proposal.title,
        status:      proposal.status,
        executed_by: proposal.executor ?? "kernel",
      },
    });
  }
}

export const btcBridge = new BtcBridgeService();
