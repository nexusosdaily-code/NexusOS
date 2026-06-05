/**
 * NexusOS Nostr Service
 * Signs and publishes WNSP spectral events to the Nostr relay network.
 * The nsec never leaves this module — all signing happens server-side.
 */

import { SimplePool, finalizeEvent, getPublicKey, nip19 } from "nostr-tools";
import type { Event as NostrEvent } from "nostr-tools";

// ── Relay list ────────────────────────────────────────────────────────────────
export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr.wine",
  "wss://relay.snort.social",
  "wss://nostr.mom",
];

let _pool: SimplePool | null = null;
function getPool(): SimplePool {
  if (!_pool) _pool = new SimplePool();
  return _pool;
}

// ── Key helpers ───────────────────────────────────────────────────────────────
function getPrivKeyBytes(): Uint8Array {
  const raw = process.env.NOSTR_NSEC ?? "";
  if (!raw) throw new Error("NOSTR_NSEC not configured");
  if (raw.startsWith("nsec1")) {
    const decoded = nip19.decode(raw);
    if (decoded.type !== "nsec") throw new Error("NOSTR_NSEC is not a valid nsec bech32 key");
    return decoded.data as Uint8Array;
  }
  // Raw hex fallback
  const bytes = Buffer.from(raw.replace(/^0x/, ""), "hex");
  if (bytes.length !== 32) throw new Error("NOSTR_NSEC must be 32-byte hex or nsec1 bech32");
  return new Uint8Array(bytes);
}

export function getNpub(): string {
  return process.env.NOSTR_NPUB ?? "";
}

export function getPubkeyHex(): string {
  try {
    return getPublicKey(getPrivKeyBytes());
  } catch {
    const npub = process.env.NOSTR_NPUB ?? "";
    if (npub.startsWith("npub1")) {
      try {
        const decoded = nip19.decode(npub);
        if (decoded.type === "npub") return decoded.data as string;
      } catch { /* ignore */ }
    }
    return npub;
  }
}

// ── Event types ───────────────────────────────────────────────────────────────
export type NostrEventKind =
  | "spectral_registration"
  | "governance_proposal"
  | "nxt_transfer"
  | "wnsp_channel"
  | "kernel_boot"
  | "note";

export interface WnspNostrPayload {
  kind:     NostrEventKind;
  content:  string;
  tags?:    string[][];
  psi?:     string;
  uri?:     string;
}

function buildTags(evt: WnspNostrPayload): string[][] {
  const base: string[][] = [
    ["t", "nexusos"],
    ["t", "wnsp"],
    ["t", "nxt"],
  ];
  if (evt.psi) {
    base.push(["wnsp", evt.psi]);
    base.push(["L", "wnsp/channel"]);
    base.push(["l", evt.psi, "wnsp/channel"]);
  }
  if (evt.uri) base.push(["r", evt.uri]);
  if (evt.kind !== "note") base.push(["t", evt.kind]);
  return [...base, ...(evt.tags ?? [])];
}

// ── Publish ───────────────────────────────────────────────────────────────────
export async function publishToNostr(
  evt: WnspNostrPayload
): Promise<{ id: string; relays: string[] }> {
  const privKey = getPrivKeyBytes();

  const template = {
    kind:       1 as number,
    created_at: Math.floor(Date.now() / 1000),
    tags:       buildTags(evt),
    content:    evt.content,
  };

  const signed: NostrEvent = finalizeEvent(template, privKey);
  const p = getPool();

  // nostr-tools v2: pool.publish() returns Promise<string>[] — one per relay
  const publishPromises = p.publish(DEFAULT_RELAYS, signed) as unknown as Promise<string>[];
  const withTimeout = DEFAULT_RELAYS.map((relay, i) =>
    Promise.race([
      publishPromises[i].then(() => relay),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 8_000)
      ),
    ])
  );

  const results = await Promise.allSettled(withTimeout);

  const published = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);

  return { id: signed.id, relays: published };
}

// ── Fetch my events ───────────────────────────────────────────────────────────
export async function fetchRecentEvents(limit = 20): Promise<NostrEvent[]> {
  const pubkey = getPubkeyHex();
  if (!pubkey) return [];
  try {
    const events = await getPool().querySync(
      DEFAULT_RELAYS,
      { authors: [pubkey], kinds: [1], limit }
    );
    return [...events].sort((a, b) => b.created_at - a.created_at);
  } catch {
    return [];
  }
}

// ── Fetch global #nexusos events ──────────────────────────────────────────────
export async function fetchGlobalWnspEvents(limit = 30): Promise<NostrEvent[]> {
  try {
    const events = await getPool().querySync(
      DEFAULT_RELAYS,
      { kinds: [1], "#t": ["nexusos"], limit }
    );
    return [...events].sort((a, b) => b.created_at - a.created_at);
  } catch {
    return [];
  }
}
