/**
 * BTC Assets Sentinel — NexusOS
 *
 * Watches both service wallet + anchor wallet for:
 *   • Ordinals  — new inscriptions via ordinals.com / Hiro API
 *   • Runes     — NEXUS•WAVELENGTH balance changes via Hiro API
 *   • BRC-20    — "wnsp" tick balance changes via Hiro API
 *
 * Pushes real-time updates to browsers via SSE and fires Telegram alerts.
 * Poll cadence: 120 s (assets change slower than raw BTC balance).
 */

import type { Response } from "express";

const HIRO     = "https://api.hiro.so";
const ORDINALS = "https://ordinals.com";
const POLL_MS  = 120_000;        // 2-minute poll

const SERVICE_WALLET = "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m";
const ANCHOR_WALLET  = "bc1pkpap9gqrc8xm02jhj8wfggmxzrxcmqtdpemyx0rtrap6xpd3pycsj2ydd6";
const RUNE_NAME      = "NEXUS•WAVELENGTH";
const BRC20_TICK     = "wnsp";

// ── HTTP ──────────────────────────────────────────────────────────────────────
async function fetchJson(url: string, opts?: RequestInit): Promise<any> {
  const r = await fetch(url, {
    ...opts,
    signal: AbortSignal.timeout(14_000),
    headers: { Accept: "application/json", ...(opts?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  return r.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface OrdinalEntry {
  id:          string;
  number:      number;
  contentType: string;
  timestamp:   string;
  address:     string;
}

export interface RuneBalance {
  name:    string;
  amount:  string;      // raw integer string
  divisor: number;      // 10^decimals
  address: string;
}

export interface Brc20Balance {
  tick:              string;
  overallBalance:    string;
  transferableBalance: string;
  address:           string;
}

export interface AssetsSnapshot {
  ordinals: { service: OrdinalEntry[]; anchor: OrdinalEntry[] };
  runes:    { service: RuneBalance[]; anchor: RuneBalance[] };
  brc20:    { service: Brc20Balance[]; anchor: Brc20Balance[] };
  checkedAt: string;
}

export interface AssetsEvent {
  type:      "new_inscription" | "rune_change" | "brc20_change" | "startup";
  wallet:    "service" | "anchor";
  message:   string;
  detail?:   string;
  timestamp: string;
}

export interface AssetsPush {
  snapshot: AssetsSnapshot | null;
  events:   AssetsEvent[];
}

// ── State ─────────────────────────────────────────────────────────────────────
let _running = false;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _snapshot: AssetsSnapshot | null = null;
const _events: AssetsEvent[] = [];

// track known inscription IDs to detect new ones
const _knownInscriptions = new Set<string>();
// track last rune amounts
const _lastRuneAmt: Record<string, string> = {};
// track last BRC-20 amounts
const _lastBrc20Amt: Record<string, string> = {};

// ── SSE clients ───────────────────────────────────────────────────────────────
const _sseClients = new Set<Response>();
export function registerAssetsSSEClient(res: Response)   { _sseClients.add(res); }
export function unregisterAssetsSSEClient(res: Response) { _sseClients.delete(res); }

function broadcastSSE() {
  if (_sseClients.size === 0) return;
  const payload: AssetsPush = { snapshot: _snapshot, events: [..._events] };
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of _sseClients) {
    try { res.write(data); } catch { _sseClients.delete(res); }
  }
}

function pushEvent(e: AssetsEvent) {
  _events.unshift(e);
  if (_events.length > 100) _events.pop();
  broadcastSSE();
}

// ── Telegram ──────────────────────────────────────────────────────────────────
async function alert(msg: string) {
  try {
    const { sendAdminAlert } = await import("./telegram-bot");
    await sendAdminAlert(msg);
  } catch { /* optional */ }
}

// ── API fetchers ──────────────────────────────────────────────────────────────
async function fetchInscriptions(address: string): Promise<OrdinalEntry[]> {
  try {
    // Hiro API — returns inscriptions held by address
    const d = await fetchJson(`${HIRO}/ordinals/v1/inscriptions?address=${address}&limit=60&order_by=inscription_number&order=desc`);
    return (d.results ?? []).map((i: any) => ({
      id:          i.id,
      number:      i.number,
      contentType: i.content_type ?? "unknown",
      timestamp:   i.timestamp   ?? new Date().toISOString(),
      address,
    }));
  } catch {
    // Fallback — ordinals.com text/plain (returns inscription count in HTML, not useful for list)
    return [];
  }
}

async function fetchRuneBalances(address: string): Promise<RuneBalance[]> {
  try {
    const d = await fetchJson(`${HIRO}/runes/v1/addresses/${address}/balances`);
    return Object.entries(d.body ?? d.results ?? d ?? {}).map(([name, info]: [string, any]) => ({
      name,
      amount:  String(info.amount ?? info.total_balance ?? 0),
      divisor: Math.pow(10, info.decimals ?? 0),
      address,
    }));
  } catch {
    return [];
  }
}

async function fetchBrc20Balances(address: string): Promise<Brc20Balance[]> {
  try {
    const d = await fetchJson(`${HIRO}/ordinals/v1/brc-20/balances?address=${address}&limit=20`);
    return (d.results ?? []).map((b: any) => ({
      tick:                b.ticker ?? b.tick,
      overallBalance:      String(b.overall_balance ?? b.balance ?? 0),
      transferableBalance: String(b.transferable_balance ?? 0),
      address,
    }));
  } catch {
    return [];
  }
}

// ── Core poll ─────────────────────────────────────────────────────────────────
async function poll() {
  const now = new Date().toISOString();

  // Fetch all six data points in parallel
  const [svcOrd, ancOrd, svcRune, ancRune, svcBrc, ancBrc] = await Promise.allSettled([
    fetchInscriptions(SERVICE_WALLET),
    fetchInscriptions(ANCHOR_WALLET),
    fetchRuneBalances(SERVICE_WALLET),
    fetchRuneBalances(ANCHOR_WALLET),
    fetchBrc20Balances(SERVICE_WALLET),
    fetchBrc20Balances(ANCHOR_WALLET),
  ]);

  const svcOrdinals  = svcOrd.status  === "fulfilled" ? svcOrd.value  : [];
  const ancOrdinals  = ancOrd.status  === "fulfilled" ? ancOrd.value  : [];
  const svcRunes     = svcRune.status === "fulfilled" ? svcRune.value : [];
  const ancRunes     = ancRune.status === "fulfilled" ? ancRune.value : [];
  const svcBrc20     = svcBrc.status  === "fulfilled" ? svcBrc.value  : [];
  const ancBrc20     = ancBrc.status  === "fulfilled" ? ancBrc.value  : [];

  _snapshot = {
    ordinals:  { service: svcOrdinals, anchor: ancOrdinals },
    runes:     { service: svcRunes,    anchor: ancRunes    },
    brc20:     { service: svcBrc20,    anchor: ancBrc20    },
    checkedAt: now,
  };

  // ── 1. Detect new inscriptions ────────────────────────────────────────────
  for (const [list, walletLabel] of [[svcOrdinals, "service"], [ancOrdinals, "anchor"]] as const) {
    for (const ins of list) {
      if (!_knownInscriptions.has(ins.id)) {
        const isNew = _knownInscriptions.size > 0; // suppress on seed
        _knownInscriptions.add(ins.id);
        if (isNew) {
          const walletShort = walletLabel === "service"
            ? `service wallet (${SERVICE_WALLET.slice(0, 12)}…)`
            : `anchor wallet (${ANCHOR_WALLET.slice(0, 12)}…)`;
          const ev: AssetsEvent = {
            type:    "new_inscription",
            wallet:  walletLabel,
            message: `🖼️ New inscription #${ins.number} on ${walletShort}`,
            detail:  `${ins.id.slice(0, 20)}… · ${ins.contentType}`,
            timestamp: now,
          };
          pushEvent(ev);
          await alert(
            `🖼️ <b>New Ordinal Inscription</b>\n\n` +
            `#${ins.number} on ${walletShort}\n` +
            `ID: <code>${ins.id}</code>\n` +
            `Type: ${ins.contentType}\n\n` +
            `<a href="https://ordinals.com/inscription/${ins.id}">View on ordinals.com</a>`
          );
          console.log(`[Assets Sentinel] 🖼️ New inscription #${ins.number} on ${walletLabel}: ${ins.id}`);
        }
      }
    }
  }

  // ── 2. Detect Rune balance changes ───────────────────────────────────────
  for (const [list, walletLabel] of [[svcRunes, "service"], [ancRunes, "anchor"]] as const) {
    for (const rune of list) {
      const key = `${walletLabel}:${rune.name}`;
      const prev = _lastRuneAmt[key];
      _lastRuneAmt[key] = rune.amount;
      if (prev !== undefined && prev !== rune.amount) {
        const prevN  = BigInt(prev  || "0");
        const currN  = BigInt(rune.amount || "0");
        const diff   = currN - prevN;
        const sign   = diff >= 0n ? "+" : "";
        const label  = walletLabel === "service"
          ? `service wallet (${SERVICE_WALLET.slice(0, 12)}…)`
          : `anchor wallet  (${ANCHOR_WALLET.slice(0, 12)}…)`;
        const isNexus = rune.name.replace(/[^A-Z•]/g, "") === RUNE_NAME.replace(/[^A-Z•]/g, "");
        const ev: AssetsEvent = {
          type:    "rune_change",
          wallet:  walletLabel,
          message: `${isNexus ? "💜" : "🟣"} ${rune.name} balance changed on ${label}`,
          detail:  `${sign}${diff} raw units · new total: ${currN}`,
          timestamp: now,
        };
        pushEvent(ev);
        if (isNexus) {
          await alert(
            `💜 <b>NEXUS•WAVELENGTH Rune Balance Changed</b>\n\n` +
            `Wallet: ${walletLabel}\n` +
            `Change: <b>${sign}${diff}</b> units\n` +
            `New balance: ${currN}\n\n` +
            `<a href="https://mempool.space/address/${walletLabel === "service" ? SERVICE_WALLET : ANCHOR_WALLET}">View wallet</a>`
          );
        }
        console.log(`[Assets Sentinel] 🟣 Rune ${rune.name} changed on ${walletLabel}: ${prev} → ${rune.amount}`);
      }
    }
  }

  // ── 3. Detect BRC-20 balance changes ─────────────────────────────────────
  for (const [list, walletLabel] of [[svcBrc20, "service"], [ancBrc20, "anchor"]] as const) {
    for (const token of list) {
      const key  = `${walletLabel}:${token.tick}`;
      const prev = _lastBrc20Amt[key];
      _lastBrc20Amt[key] = token.overallBalance;
      if (prev !== undefined && prev !== token.overallBalance) {
        const isWnsp = token.tick.toLowerCase() === BRC20_TICK;
        const label  = walletLabel === "service"
          ? `service wallet (${SERVICE_WALLET.slice(0, 12)}…)`
          : `anchor wallet  (${ANCHOR_WALLET.slice(0, 12)}…)`;
        const ev: AssetsEvent = {
          type:    "brc20_change",
          wallet:  walletLabel,
          message: `${isWnsp ? "🌊" : "🔵"} BRC-20 ${token.tick.toUpperCase()} changed on ${label}`,
          detail:  `${prev} → ${token.overallBalance} (transferable: ${token.transferableBalance})`,
          timestamp: now,
        };
        pushEvent(ev);
        if (isWnsp) {
          await alert(
            `🌊 <b>BRC-20 WNSP Balance Changed</b>\n\n` +
            `Wallet: ${walletLabel}\n` +
            `Old balance: ${prev}\n` +
            `New balance: <b>${token.overallBalance}</b>\n` +
            `Transferable: ${token.transferableBalance}\n\n` +
            `<a href="https://ordinals.com/brc-20">View BRC-20</a>`
          );
        }
        console.log(`[Assets Sentinel] 🔵 BRC-20 ${token.tick} changed on ${walletLabel}: ${prev} → ${token.overallBalance}`);
      }
    }
  }

  // Always push updated snapshot to all open tabs
  broadcastSSE();
}

// ── Seed (no alerts for already-known assets) ─────────────────────────────────
async function seed() {
  const [svcOrd, ancOrd, svcRune, ancRune, svcBrc, ancBrc] = await Promise.allSettled([
    fetchInscriptions(SERVICE_WALLET),
    fetchInscriptions(ANCHOR_WALLET),
    fetchRuneBalances(SERVICE_WALLET),
    fetchRuneBalances(ANCHOR_WALLET),
    fetchBrc20Balances(SERVICE_WALLET),
    fetchBrc20Balances(ANCHOR_WALLET),
  ]);

  for (const r of [svcOrd, ancOrd]) {
    if (r.status === "fulfilled") r.value.forEach(i => _knownInscriptions.add(i.id));
  }

  for (const [r, walletLabel] of [[svcRune, "service"], [ancRune, "anchor"]] as const) {
    if (r.status === "fulfilled") {
      r.value.forEach(rune => { _lastRuneAmt[`${walletLabel}:${rune.name}`] = rune.amount; });
    }
  }

  for (const [r, walletLabel] of [[svcBrc, "service"], [ancBrc, "anchor"]] as const) {
    if (r.status === "fulfilled") {
      r.value.forEach(tok => { _lastBrc20Amt[`${walletLabel}:${tok.tick}`] = tok.overallBalance; });
    }
  }

  const inscCount = _knownInscriptions.size;
  console.log(`[Assets Sentinel] Seeded — ${inscCount} inscriptions, ${Object.keys(_lastRuneAmt).length} rune entries, ${Object.keys(_lastBrc20Amt).length} BRC-20 entries`);
}

// ── Public API ────────────────────────────────────────────────────────────────
export function getAssetsSnapshot(): AssetsSnapshot | null { return _snapshot; }
export function getAssetsEvents(): AssetsEvent[] { return [..._events]; }

export async function startAssetsSentinel() {
  if (_running) return;
  _running = true;

  console.log(`[Assets Sentinel] Started — watching Ordinals / Runes / BRC-20 every ${POLL_MS / 1000}s`);
  pushEvent({ type: "startup", wallet: "service", message: "Assets Sentinel started — watching Ordinals, Runes, BRC-20", timestamp: new Date().toISOString() });

  await seed();
  await poll();

  const loop = async () => {
    if (!_running) return;
    await poll();
    _timer = setTimeout(loop, POLL_MS);
  };
  _timer = setTimeout(loop, POLL_MS);
}

export function stopAssetsSentinel() {
  _running = false;
  if (_timer) { clearTimeout(_timer); _timer = null; }
  console.log("[Assets Sentinel] Stopped");
}
