/**
 * NexusOS Nostr Service
 * Signs and publishes WNSP spectral events to the Nostr relay network.
 * The nsec never leaves this module — all signing happens server-side.
 */

import { SimplePool, Relay, finalizeEvent, getPublicKey, nip19 } from "nostr-tools";
import type { Event as NostrEvent } from "nostr-tools";

// ── Relay list ────────────────────────────────────────────────────────────────
export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr.wine",
  "wss://relay.snort.social",
  "wss://nostr.mom",
  "wss://purplepag.es",
  "wss://relay.primal.net",
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
  kind?:      NostrEventKind;   // optional — defaults to "note"
  content:    string;
  tags?:      string[][];
  hashtags?:  string[];         // convenience: each becomes ["t", tag]
  psi?:       string;
  uri?:       string;
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
  const k = evt.kind ?? "note";
  if (k !== "note") base.push(["t", k]);
  // hashtags convenience field
  for (const h of evt.hashtags ?? []) {
    const tag = h.replace(/^#/, "").toLowerCase();
    if (tag) base.push(["t", tag]);
  }
  return [...base, ...(evt.tags ?? [])];
}

// ── Publish kind-0 profile metadata ──────────────────────────────────────────
export async function publishProfile(meta: {
  name:    string;
  about:   string;
  website: string;
  picture: string;
  banner:  string;
  lud16:   string;
  nip05:   string;
}): Promise<{ id: string; relays: string[] }> {
  const privKey = getPrivKeyBytes();
  const template = {
    kind:       0 as number,
    created_at: Math.floor(Date.now() / 1000),
    tags:       [] as string[][],
    content:    JSON.stringify(meta),
  };
  const signed: NostrEvent = finalizeEvent(template, privKey);
  const p = getPool();
  const publishPromises = p.publish(DEFAULT_RELAYS, signed) as unknown as Promise<string>[];
  const withTimeout = DEFAULT_RELAYS.map((relay, i) =>
    Promise.race([
      publishPromises[i].then(() => relay),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8_000)),
    ])
  );
  const results  = await Promise.allSettled(withTimeout);
  const published = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);
  return { id: signed.id, relays: published };
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

export interface RelayResult {
  relay:   string;
  ok:      boolean;
  reason?: string;
}

// ── Sign a kind-1 note and return it for browser publishing ───────────────────
export async function signNoteForNostr(opts: {
  content:  string;
  hashtags?: string[];
  uri?:      string;
}): Promise<{
  id:          string;
  signedEvent: object;
  relays:      string[];
}> {
  const privKey = getPrivKeyBytes();
  const tags: string[][] = [
    ["t", "nexusos"], ["t", "wnsp"], ["t", "nxt"],
    ["t", "bitcoin"], ["t", "nostr"], ["t", "photonics"], ["t", "physics"],
  ];
  for (const tag of opts.hashtags ?? []) tags.push(["t", tag]);
  if (opts.uri) tags.push(["r", opts.uri]);

  const signed: NostrEvent = finalizeEvent({
    kind:       1 as number,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content:    opts.content,
  }, privKey);

  return { id: signed.id, signedEvent: signed as unknown as object, relays: DEFAULT_RELAYS };
}

// ── Sign a kind-30023 article and return the signed event; let the browser publish ─
export async function signArticleForNostr(opts: {
  slug:        string;
  title:       string;
  summary:     string;
  content:     string;
  hashtags?:   string[];
  imageUrl?:   string;
}): Promise<{
  id:         string;
  naddr:      string;
  njumpUrl:   string;
  hablaUrl:   string;
  signedEvent: object;   // full signed NostrEvent for browser publishing
  relays:     string[];  // suggested relays for browser to use
}> {
  const privKey = getPrivKeyBytes();
  const now     = Math.floor(Date.now() / 1000);

  const tags: string[][] = [
    ["d",            opts.slug],
    ["title",        opts.title],
    ["summary",      opts.summary],
    ["published_at", String(now)],
    ["t",            "nexusos"],
    ["t",            "wnsp"],
    ["t",            "nxt"],
    ["t",            "bitcoin"],
    ["t",            "nostr"],
    ["t",            "photonics"],
    ["t",            "physics"],
  ];
  for (const tag of opts.hashtags ?? []) tags.push(["t", tag]);
  if (opts.imageUrl) tags.push(["image", opts.imageUrl]);

  const signed: NostrEvent = finalizeEvent({
    kind:       30023 as number,
    created_at: now,
    tags,
    content:    opts.content,
  }, privKey);

  const pubkey = getPublicKey(privKey);
  const naddr  = nip19.naddrEncode({
    kind:       30023,
    pubkey,
    identifier: opts.slug,
    relays:     DEFAULT_RELAYS,
  });

  return {
    id:          signed.id,
    naddr,
    njumpUrl:    `https://njump.me/${naddr}`,
    hablaUrl:    `https://habla.news/a/${naddr}`,
    signedEvent: signed as unknown as object,
    relays:      DEFAULT_RELAYS,
  };
}

// ── Publish kind-30023 long-form article (NIP-23) ─────────────────────────────
// Uses individual Relay connections so we capture exact OK/reject reasons
// rather than swallowing timeouts silently.
export async function publishArticleToNostr(opts: {
  slug:        string;
  title:       string;
  summary:     string;
  content:     string;
  hashtags?:   string[];
  imageUrl?:   string;
}): Promise<{
  id:         string;
  naddr:      string;
  njumpUrl:   string;
  hablaUrl:   string;
  relays:     string[];          // accepted
  relayLog:   RelayResult[];     // full per-relay detail
  signedJson: string;            // raw event for manual relay if needed
}> {
  const privKey = getPrivKeyBytes();
  const now     = Math.floor(Date.now() / 1000);

  const tags: string[][] = [
    ["d",            opts.slug],
    ["title",        opts.title],
    ["summary",      opts.summary],
    ["published_at", String(now)],
    ["t",            "nexusos"],
    ["t",            "wnsp"],
    ["t",            "nxt"],
    ["t",            "bitcoin"],
    ["t",            "nostr"],
    ["t",            "photonics"],
    ["t",            "physics"],
  ];
  for (const tag of opts.hashtags ?? []) tags.push(["t", tag]);
  if (opts.imageUrl) tags.push(["image", opts.imageUrl]);

  const signed: NostrEvent = finalizeEvent({
    kind:       30023 as number,
    created_at: now,
    tags,
    content:    opts.content,
  }, privKey);

  console.log(`[Article] Signed event ${signed.id} — publishing to ${DEFAULT_RELAYS.length} relays…`);

  // Publish to each relay individually so we get exact OK / rejection reasons
  const publishOne = async (relayUrl: string): Promise<RelayResult> => {
    const CONNECT_TIMEOUT = 8_000;
    const PUBLISH_TIMEOUT = 12_000;
    try {
      let relay: InstanceType<typeof Relay>;
      try {
        relay = await Promise.race([
          Relay.connect(relayUrl),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("connect timeout")), CONNECT_TIMEOUT)
          ),
        ]);
      } catch (e: any) {
        return { relay: relayUrl, ok: false, reason: `connect: ${e.message}` };
      }

      try {
        await Promise.race([
          relay.publish(signed),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("publish timeout")), PUBLISH_TIMEOUT)
          ),
        ]);
        relay.close();
        console.log(`[Article]  ✓ ${relayUrl}`);
        return { relay: relayUrl, ok: true };
      } catch (e: any) {
        try { relay.close(); } catch { /* ignore */ }
        const reason = e?.message ?? String(e);
        console.log(`[Article]  ✗ ${relayUrl} — ${reason}`);
        return { relay: relayUrl, ok: false, reason };
      }
    } catch (e: any) {
      return { relay: relayUrl, ok: false, reason: String(e) };
    }
  };

  const relayLog = await Promise.all(DEFAULT_RELAYS.map(publishOne));
  const accepted = relayLog.filter(r => r.ok).map(r => r.relay);

  console.log(`[Article] Published to ${accepted.length}/${DEFAULT_RELAYS.length} relays`);
  relayLog.forEach(r => {
    if (!r.ok) console.log(`[Article]   ✗ ${r.relay}: ${r.reason}`);
  });

  const pubkey = getPublicKey(privKey);
  const naddr  = nip19.naddrEncode({
    kind:       30023,
    pubkey,
    identifier: opts.slug,
    relays:     accepted.length ? accepted : DEFAULT_RELAYS,
  });

  return {
    id:         signed.id,
    naddr,
    njumpUrl:   `https://njump.me/${naddr}`,
    hablaUrl:   `https://habla.news/a/${naddr}`,
    relays:     accepted,
    relayLog,
    signedJson: JSON.stringify(signed, null, 2),
  };
}

// ── NIP-75 Zap Goal (kind 9041) ───────────────────────────────────────────────
export async function publishZapGoal(opts: {
  title:       string;
  description: string;
  goalMsats:   number;        // target in millisats
  lightningAddr: string;      // LNURL or lightning address for zap receipts
  relays?:     string[];
  imageUrl?:   string;
  closedAt?:   number;        // unix timestamp
}): Promise<{ id: string; relays: string[]; nostrLink: string }> {
  const privKey = getPrivKeyBytes();
  const pubkey  = getPublicKey(privKey);

  const tags: string[][] = [
    ["relays",  ...(opts.relays ?? DEFAULT_RELAYS)],
    ["amount",  String(opts.goalMsats)],
    ["lnurl",   opts.lightningAddr],
    ["t",       "crowdfund"],
    ["t",       "nexusos"],
    ["t",       "bitcoin"],
    ["t",       "lightning"],
    ["t",       "wnsp"],
  ];
  if (opts.imageUrl) tags.push(["image", opts.imageUrl]);
  if (opts.closedAt) tags.push(["closed_at", String(opts.closedAt)]);

  const content = `${opts.title}\n\n${opts.description}`;

  const signed: NostrEvent = finalizeEvent({
    kind:       9041 as number,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  }, privKey);

  const p = getPool();
  const publishPromises = p.publish(DEFAULT_RELAYS, signed) as unknown as Promise<string>[];
  const withTimeout = DEFAULT_RELAYS.map((relay, i) =>
    Promise.race([
      publishPromises[i].then(() => relay),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8_000)),
    ])
  );
  const results  = await Promise.allSettled(withTimeout);
  const accepted = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map(r => r.value);

  const neventId = nip19.neventEncode({ id: signed.id, author: pubkey, relays: accepted });

  console.log(`[ZapGoal] Published kind-9041 to ${accepted.length}/${DEFAULT_RELAYS.length} relays`);
  return {
    id:        signed.id,
    relays:    accepted,
    nostrLink: `https://primal.net/e/${neventId}`,
  };
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
