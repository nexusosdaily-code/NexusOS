/**
 * NXT Campaign Agent
 * ==================
 * Sends rotating educational/marketing messages about NXT, staking,
 * and WNUSD to Telegram channel + Nostr on a configurable schedule.
 *
 * Default: every 4 hours. Overridden by NXT_CAMPAIGN_INTERVAL_MS env var.
 * Channels: TELEGRAM_CHANNEL_ID (or TELEGRAM_ADMIN_ID fallback) + Nostr.
 * Disable: set NXT_CAMPAIGN_DISABLED=true
 */

import { db } from "./db";
import { campaignLog } from "../shared/schema";
import { desc } from "drizzle-orm";
import { publishToNostr } from "./nostr-service";

const TAG = "[NxtCampaign]";
const DEFAULT_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ── Campaign state (exported for API) ────────────────────────────────────────
export interface CampaignState {
  running:      boolean;
  intervalMs:   number;
  nextFireAt:   number | null;
  slotIndex:    number;
  totalFired:   number;
  lastFireAt:   number | null;
  lastStatus:   string;
  channels:     string[];
}

let _state: CampaignState = {
  running:    false,
  intervalMs: DEFAULT_INTERVAL_MS,
  nextFireAt: null,
  slotIndex:  0,
  totalFired: 0,
  lastFireAt: null,
  lastStatus: "not started",
  channels:   [],
};

let _timer: ReturnType<typeof setInterval> | null = null;

export function getCampaignState(): CampaignState { return { ..._state }; }

// ── Message slots ─────────────────────────────────────────────────────────────
interface Slot {
  id: number;
  label: string;
  emoji: string;
  telegram: string;  // Telegram HTML
  nostr:    string;  // plain text / Nostr markdown
  tags:     string[];
}

export const SLOTS: Slot[] = [
  {
    id: 0, label: "BTC dip → NXT opportunity", emoji: "⚡",
    telegram: `⚡ <b>BTC is down. That's your signal.</b>

When Bitcoin dips, most people panic. Smart builders do the opposite — they <b>buy NXT</b>.

Why?

🔶 NXT is the <b>native token of NexusOS</b> — a physics-based civilization OS built on wavelength physics, not cryptographic hashing.
⚡ 1,000 sats = 1 NXT. Buy dips. Stack physics.
🔒 Stake NXT and earn up to <b>420% APY</b>.
💎 Staking auto-mints <b>WNUSD</b> — a sats-backed stablecoin that funds hardware production.

This isn't speculation. Every NXT funds the Kardashev Type I hardware roadmap.

👉 nexusos.io — buy NXT, stake, earn WNUSD.
#NXT #NexusOS #Bitcoin #WNUSD #Stake`,
    nostr: `⚡ BTC is down. That's your signal.

When Bitcoin dips, smart builders buy NXT — the native token of NexusOS, a physics-based civilization OS.

1,000 sats = 1 NXT
Stake NXT → earn up to 420% APY
Staking auto-mints WNUSD (sats-backed stablecoin)
WNUSD funds real hardware production

Every NXT = a piece of the Kardashev Type I roadmap.

nexusos.io #NXT #NexusOS #Bitcoin #WNUSD`,
    tags: ["NXT","NexusOS","Bitcoin","WNUSD","Stake"],
  },
  {
    id: 1, label: "Staking yields explained", emoji: "🔒",
    telegram: `🔒 <b>NXT Staking — Real Yield, Physics-Backed</b>

Six lock periods. Six yield tiers. All backed by the WNSP physics engine.

<pre>
 Period   APY     WNUSD Auto-Minted
──────────────────────────────────
  7 days  5%      ✅ yes
 14 days  12%     ✅ yes
 30 days  28%     ✅ yes
 90 days  90%     ✅ yes
180 days  200%    ✅ yes
365 days  420%    ✅ yes
</pre>

💡 Every stake auto-mints <b>WNUSD</b> at 1:1 against your sats collateral.
🏭 WNUSD is spent on NexusOS <b>photonic hardware</b> production.
📐 Yield is calculated using <b>E=hf</b> — actual electromagnetic wave physics.

Stake via Nostr DM: just send <code>!stake 10000 30</code> to the NexusOS bot.

👉 nexusos.io/lightning-wallet
#NXT #Staking #WNUSD #NexusOS #DeFi`,
    nostr: `🔒 NXT Staking — Real Yield, Physics-Backed

Six lock periods. Six yield tiers.

 7 days  →  5% APY
14 days  → 12% APY
30 days  → 28% APY
90 days  → 90% APY
180 days → 200% APY
365 days → 420% APY

Every stake auto-mints WNUSD at 1:1 against sats collateral.
WNUSD funds photonic hardware production.
Yield formula: E=hf (real electromagnetic physics)

DM bot: !stake 10000 30

nexusos.io #NXT #Staking #WNUSD #NexusOS`,
    tags: ["NXT","Staking","WNUSD","NexusOS","DeFi"],
  },
  {
    id: 2, label: "WNUSD stablecoin hardware funding", emoji: "💎",
    telegram: `💎 <b>WNUSD — The Stablecoin That Builds Hardware</b>

Most stablecoins sit idle. <b>WNUSD is different.</b>

🔹 1 WNUSD = 1 sat of real Bitcoin collateral
🔹 Auto-minted when you stake NXT
🔹 Auto-redeemed when you unstake
🔹 Collateral never moves without your approval

<b>What WNUSD funds:</b>
🏭 SNIC — Spectral Network Interface Chip
📡 PHR-1 — Photonic Hardware Relay
🌐 Spectral Relay Mesh v1
🔧 WavelengthScript Compiler α

This is a <b>crowdfunded photonic computing stack</b> that runs the WavelengthScript language natively in hardware by ~2032. No rewrite needed — NexusOS is already written in the language of the destination hardware.

👉 Stake NXT. Mint WNUSD. Build the future.
nexusos.io
#WNUSD #NXT #PhotonicComputing #NexusOS #Hardware`,
    nostr: `💎 WNUSD — The Stablecoin That Builds Hardware

1 WNUSD = 1 sat of real Bitcoin collateral
Auto-minted when you stake NXT
Auto-redeemed when you unstake

WNUSD funds:
• SNIC — Spectral Network Interface Chip
• PHR-1 — Photonic Hardware Relay
• Spectral Relay Mesh v1
• WavelengthScript Compiler α

Photonic computing stack by ~2032. NexusOS already speaks the language of the destination hardware — no rewrite needed.

Stake NXT → Mint WNUSD → Build the future.

nexusos.io #WNUSD #NXT #PhotonicComputing #NexusOS`,
    tags: ["WNUSD","NXT","PhotonicComputing","NexusOS","Hardware"],
  },
  {
    id: 3, label: "Physics-based blockchain intro", emoji: "📐",
    telegram: `📐 <b>Why NexusOS Replaces Cryptographic Hashing With Physics</b>

Traditional blockchains use SHA-256 — an arbitrary math function.

NexusOS uses <b>Maxwell's equations.</b>

⚡ Every address is a wavelength (380–780nm)
📡 Every transaction validates against electromagnetic wave physics
🌈 25,600 orthogonal WNSP channels — orthogonal by quantum mechanics, not software policy
💫 Fee formula: E = hf (Planck's equation — real photon energy)

This isn't a gimmick. When photonic ASICs arrive (~2032), NexusOS nodes run on actual light — not transistors.

<b>NXT is the token of this network.</b> 1,000 sats = 1 NXT.

👉 Read the spec: nexusos.io/hardware-spec
#NexusOS #NXT #WNSP #Physics #Bitcoin`,
    nostr: `📐 Why NexusOS replaces cryptographic hashing with physics

Traditional blockchains: SHA-256 (arbitrary math)
NexusOS: Maxwell's equations

Every address = a wavelength (380–780nm)
Every transaction validates against electromagnetic wave physics
25,600 orthogonal WNSP channels (quantum mechanics, not software)
Fee = E=hf (real photon energy)

When photonic ASICs arrive (~2032), NexusOS nodes run on actual light.

NXT is the token of this network.
1,000 sats = 1 NXT

nexusos.io/hardware-spec #NexusOS #NXT #WNSP #Physics`,
    tags: ["NexusOS","NXT","WNSP","Physics","Bitcoin"],
  },
  {
    id: 4, label: "Nostr DM bot — wallet in your pocket", emoji: "🤖",
    telegram: `🤖 <b>Control Your NexusOS Wallet From Nostr DMs</b>

No app needed. No browser. Just Nostr.

Link your npub at nexusos.io/nostr-bridge, then DM the NexusOS bot:

<code>!balance</code>   — sats + NXT balance
<code>!invoice 50000</code> — Lightning deposit invoice
<code>!buynxt 10000</code>  — swap sats → NXT
<code>!stake 10000 30</code> — stake for 28% APY + WNUSD

Works on Damus, Amethyst, Snort — any NIP-04 compatible client.

⚡ Physics-based wallet. Censorship-proof addressing. Real yield.

👉 nexusos.io/nostr-bridge
#NXT #Nostr #Lightning #Bitcoin #NexusOS`,
    nostr: `🤖 Control your NexusOS wallet from Nostr DMs

Link your npub → nexusos.io/nostr-bridge
Then DM the bot:

!balance      → sats + NXT
!invoice 50000 → Lightning invoice
!buynxt 10000  → sats → NXT
!stake 10000 30 → 28% APY + WNUSD

Works on Damus, Amethyst, Snort.

Physics-based wallet. Censorship-proof. Real yield.

nexusos.io/nostr-bridge #NXT #Nostr #Lightning #NexusOS`,
    tags: ["NXT","Nostr","Lightning","Bitcoin","NexusOS"],
  },
  {
    id: 5, label: "Kardashev Type I mission", emoji: "🚀",
    telegram: `🚀 <b>NexusOS — Blueprint for a Kardashev Type I Civilisation</b>

Kardashev Type I: a civilisation that harnesses the full energy output of its home planet.

NexusOS is the operating system for that transition.

🌐 WNSP Protocol — wavelength-based addressing (no DNS, no IP)
🔆 25,600 photonic channels — ready for optical hardware
💰 NXT token — physics-priced, sats-settled
💎 WNUSD — stablecoin funding the hardware stack
🤖 AI Kernel — 6-phase boot, spectral authority bands
📡 Photonic computing roadmap — ~2032 hardware target

<b>Every NXT you hold is a stake in this mission.</b>

Buy NXT when BTC dips. Stake for yield. Fund hardware. Build civilisation.

👉 nexusos.io
#NexusOS #NXT #KardashevTypeI #WNUSD #Photonics #Bitcoin`,
    nostr: `🚀 NexusOS — Blueprint for a Kardashev Type I Civilisation

Kardashev Type I: full planetary energy harnessing.

NexusOS is the OS for that transition:

• WNSP — wavelength-based addressing (no DNS/IP)
• 25,600 photonic channels
• NXT — physics-priced, sats-settled
• WNUSD — stablecoin → hardware funding
• AI Kernel — spectral authority bands
• Photonic hardware target ~2032

Every NXT = a stake in this mission.

Buy the dip. Stake. Fund hardware. Build civilisation.

nexusos.io #NexusOS #NXT #KardashevTypeI #WNUSD #Photonics`,
    tags: ["NexusOS","NXT","KardashevTypeI","WNUSD","Photonics","Bitcoin"],
  },
  {
    id: 6, label: "Ordinals — WNSP inscribed on Bitcoin", emoji: "🪬",
    telegram: `🪬 <b>NexusOS Physics — Now Permanently Inscribed on Bitcoin</b>

Every Bitcoin block is a permanent ledger. Every Ordinal inscription is immutable data — forever.

NexusOS has inscribed its core specifications onto the Bitcoin base layer via Ordinals:

📜 <b>WNSP Protocol spec</b> — wavelength-based addressing
🔮 <b>WavelengthScript Compiler α</b> — the language of photonic hardware
🌈 <b>25,600 Ψ channel map</b> — the Hilbert space routing table
🔬 <b>Compression State Theory</b> — the physics underpinning it all

<b>Why Ordinals?</b> The physics spec must outlast any server. Inscribed on Bitcoin it cannot be censored, altered, or deleted — guaranteed by proof-of-work.

NXT is the token that funds expansion of this inscribed civilisation OS.
1,000 sats = 1 NXT. Stack physics.

👉 nexusos.io/hardware-spec
#Ordinals #Bitcoin #NXT #NexusOS #WNSP #Inscription`,
    nostr: `🪬 NexusOS physics — permanently inscribed on Bitcoin via Ordinals

Every Ordinal is immutable data, secured by proof-of-work forever.

Inscribed:
• WNSP Protocol spec — wavelength-based addressing
• WavelengthScript Compiler α
• 25,600 Ψ channel map (Hilbert space routing)
• Compression State Theory

Why inscribe? Physics specs must outlast any server. Bitcoin makes them uncensorable, unalterable, permanent.

NXT funds the expansion of this inscribed civilisation OS.
1,000 sats = 1 NXT

nexusos.io/hardware-spec #Ordinals #Bitcoin #NXT #NexusOS #WNSP`,
    tags: ["Ordinals","Bitcoin","NXT","NexusOS","WNSP","Inscription"],
  },
  {
    id: 7, label: "NEXUS•WAVELENGTH Rune — BRC-20 on Bitcoin", emoji: "🌈",
    telegram: `🌈 <b>NEXUS•WAVELENGTH — The Physics Rune on Bitcoin</b>

A Rune is not just a token. It's a permanent identifier etched into the Bitcoin UTXO set.

<b>NEXUS•WAVELENGTH</b> is the NexusOS Rune — living natively on Bitcoin.

⚡ <b>Why a Rune?</b>
Runes use Bitcoin's own UTXO model — no side-chain, no bridge, no custodian.
Every NEXUS•WAVELENGTH unit is secured by Bitcoin's proof-of-work.

🔶 <b>Relationship to NXT:</b>
NXT (Lightning/off-chain physics token) ↔ NEXUS•WAVELENGTH (on-chain Bitcoin Rune)
The two tokens are complementary — NXT for speed, the Rune for permanence.

💎 <b>What the Rune funds:</b>
• SNIC photonic chip production
• Spectral Relay Mesh v1 hardware
• WavelengthScript silicon compiler

Mint at nexusos.io/rune-mint · Etch at nexusos.io/rune-etching

1,000 sats = 1 NXT · Stack the Rune. Build the mesh.
#NexusWavelength #Runes #BRC20 #Bitcoin #NXT #NexusOS`,
    nostr: `🌈 NEXUS•WAVELENGTH — the physics Rune on Bitcoin

Not a side-chain. Not a bridge. Native Bitcoin UTXO.

Every NEXUS•WAVELENGTH unit is secured by proof-of-work.

NXT (Lightning/off-chain) ↔ NEXUS•WAVELENGTH (on-chain Rune)
Speed vs permanence — two faces of the same physics stack.

The Rune funds:
• SNIC photonic chip production
• Spectral Relay Mesh v1 hardware
• WavelengthScript silicon compiler

Mint → nexusos.io/rune-mint
Etch → nexusos.io/rune-etching

#NexusWavelength #Runes #Bitcoin #NXT #NexusOS`,
    tags: ["NexusWavelength","Runes","BRC20","Bitcoin","NXT","NexusOS"],
  },
];

// ── Telegram channel sender ───────────────────────────────────────────────────
async function sendTelegram(text: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };

  // Prefer a dedicated channel ID; fall back to admin chat
  const chatId = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_ADMIN_ID;
  if (!chatId) return { ok: false, error: "No TELEGRAM_CHANNEL_ID or TELEGRAM_ADMIN_ID set" };

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: false }),
    });
    const d = await r.json();
    if (!r.ok) return { ok: false, error: d.description ?? `HTTP ${r.status}` };
    return { ok: true, messageId: d.result?.message_id };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Nostr sender ─────────────────────────────────────────────────────────────
async function sendNostr(slot: Slot): Promise<{ ok: boolean; eventId?: string; error?: string }> {
  try {
    const result = await publishToNostr({
      kind:    "note",
      content: slot.nostr,
      tags:    slot.tags,
    });
    return { ok: true, eventId: result.id };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Fire one campaign tick ───────────────────────────────────────────────────
// ── Event-driven broadcast (fires immediately, not on schedule) ───────────────
export async function fireEventBroadcast(opts: {
  emoji:     string;
  title:     string;
  body:      string;
  hashtags:  string[];
}): Promise<{ tg: any; nostr: any }> {
  const tags = opts.hashtags.map(t => `#${t}`).join(" ");
  const tgText =
    `${opts.emoji} <b>${opts.title}</b>\n\n${opts.body}\n\n${tags}`;
  const nostrText =
    `${opts.emoji} ${opts.title}\n\n${opts.body}\n\n${tags}`;

  const slot: Slot = {
    id: -1, label: opts.title, emoji: opts.emoji,
    telegram: tgText, nostr: nostrText, tags: opts.hashtags,
  };

  const [tgRes, nsRes] = await Promise.allSettled([
    sendTelegram(tgText),
    sendNostr(slot),
  ]);

  const tg    = tgRes.status    === "fulfilled" ? tgRes.value    : { ok: false, error: String((tgRes    as any).reason) };
  const nostr = nsRes.status    === "fulfilled" ? nsRes.value    : { ok: false, error: String((nsRes    as any).reason) };

  console.log(`${TAG} EventBroadcast "${opts.title}" — tg:${tg.ok} nostr:${nostr.ok}`);
  return { tg, nostr };
}

export async function fireCampaignSlot(slotIndex?: number): Promise<{ slot: Slot; tg: any; nostr: any }> {
  const idx  = slotIndex ?? (_state.slotIndex % SLOTS.length);
  const slot = SLOTS[idx];

  console.log(`${TAG} Firing slot ${idx} — "${slot.label}"`);

  const [tg, ns] = await Promise.allSettled([
    sendTelegram(slot.telegram),
    sendNostr(slot),
  ]);

  const tgRes    = tg.status === "fulfilled" ? tg.value : { ok: false, error: String(tg.reason) };
  const nsRes    = ns.status === "fulfilled" ? ns.value : { ok: false, error: String(ns.reason) };
  const anyOk    = tgRes.ok || nsRes.ok;
  const channel  = tgRes.ok && nsRes.ok ? "both" : tgRes.ok ? "telegram" : nsRes.ok ? "nostr" : "none";
  const errMsg   = [!tgRes.ok && `TG: ${tgRes.error}`, !nsRes.ok && `Nostr: ${nsRes.error}`].filter(Boolean).join(" | ") || undefined;

  // Persist log
  try {
    await db.insert(campaignLog).values({
      slot:        idx,
      channel,
      status:      anyOk ? "ok" : "error",
      errorMsg:    errMsg ?? null,
      nostrEventId: nsRes.eventId ?? null,
      telegramMsgId: tgRes.messageId ?? null,
    });
  } catch (e: any) { console.warn(`${TAG} log insert failed:`, e.message); }

  // Advance slot pointer
  if (slotIndex === undefined) _state.slotIndex = (idx + 1) % SLOTS.length;
  _state.totalFired++;
  _state.lastFireAt  = Date.now();
  _state.lastStatus  = anyOk ? `ok — slot ${idx} "${slot.label}"` : `error — ${errMsg}`;

  console.log(`${TAG} Slot ${idx} done — TG:${tgRes.ok ? "✓" : "✗"} Nostr:${nsRes.ok ? "✓" : "✗"}`);
  return { slot, tg: tgRes, nostr: nsRes };
}

// ── Start / stop ─────────────────────────────────────────────────────────────
export function startNxtCampaignAgent(intervalMs?: number) {
  if (_timer) return;
  if (process.env.NXT_CAMPAIGN_DISABLED === "true") {
    console.log(`${TAG} Disabled via NXT_CAMPAIGN_DISABLED=true`);
    return;
  }

  const parsedMs = parseInt(process.env.NXT_CAMPAIGN_INTERVAL_MS ?? "0") || 0;
  const ms = intervalMs ?? (parsedMs > 0 ? parsedMs : DEFAULT_INTERVAL_MS);
  _state.intervalMs = ms;

  const tgCh  = (process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_ADMIN_ID) ?? "(none)";
  const nostrOk = !!process.env.NOSTR_NSEC;
  _state.channels = [
    process.env.TELEGRAM_BOT_TOKEN ? `Telegram → ${tgCh}` : null,
    nostrOk ? "Nostr" : null,
  ].filter(Boolean) as string[];

  console.log(`${TAG} Started — interval ${ms / 60000}min · channels: ${_state.channels.join(", ")}`);

  _state.running   = true;
  _state.nextFireAt = Date.now() + ms;

  _timer = setInterval(async () => {
    _state.nextFireAt = Date.now() + ms;
    await fireCampaignSlot().catch(e => console.error(`${TAG} tick error:`, e.message));
  }, ms);
}

export function stopNxtCampaignAgent() {
  if (_timer) { clearInterval(_timer); _timer = null; }
  _state.running   = false;
  _state.nextFireAt = null;
  console.log(`${TAG} Stopped`);
}

export async function getCampaignHistory(limit = 30) {
  try {
    return await db.select().from(campaignLog).orderBy(desc(campaignLog.sentAt)).limit(limit);
  } catch { return []; }
}
