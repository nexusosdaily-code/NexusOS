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

🔶 NXT is the <b>native token of NexusOS</b> — a physics-based OS built on wavelength physics, not cryptographic hashing.
⚡ 1,000 sats = 1 NXT. Buy dips. Stack physics.
🔒 Stake NXT and earn up to <b>420% APY</b>.
💎 Staking auto-mints <b>WNUSD</b> — a sats-backed stablecoin that funds hardware production.
🪙 Two live Bitcoin Runes: NEXUS•WAVELENGTH (952596:379) + WNSP•BTC (952733:1958)

This isn't speculation. Every NXT funds the Kardashev Type I hardware roadmap.

👉 wnsp.io — buy NXT, stake, earn WNUSD.
#NXT #NexusOS #Bitcoin #WNUSD #Stake`,
    nostr: `⚡ BTC is down. That's your signal.

When Bitcoin dips, smart builders buy NXT — the native token of NexusOS, a physics-based civilization OS.

1,000 sats = 1 NXT
Stake NXT → earn up to 420% APY
Staking auto-mints WNUSD (sats-backed stablecoin)
WNUSD funds real hardware production
Two live Bitcoin Runes on mainnet

Every NXT = a piece of the Kardashev Type I roadmap.

wnsp.io #NXT #NexusOS #Bitcoin #WNUSD`,
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

👉 wnsp.io/lightning-wallet
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

wnsp.io #NXT #Staking #WNUSD #NexusOS`,
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
wnsp.io
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

wnsp.io #WNUSD #NXT #PhotonicComputing #NexusOS`,
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
Two live Bitcoin Runes on mainnet: NEXUS•WAVELENGTH + WNSP•BTC

👉 Read the spec: wnsp.io/hardware-spec
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
Two live Bitcoin Runes: NEXUS•WAVELENGTH + WNSP•BTC

wnsp.io/hardware-spec #NexusOS #NXT #WNSP #Physics`,
    tags: ["NexusOS","NXT","WNSP","Physics","Bitcoin"],
  },
  {
    id: 4, label: "Nostr DM bot — wallet in your pocket", emoji: "🤖",
    telegram: `🤖 <b>Control Your NexusOS Wallet From Nostr DMs</b>

No app needed. No browser. Just Nostr.

Link your npub at wnsp.io/nostr-bridge, then DM the NexusOS bot:

<code>!balance</code>    — sats + NXT balance
<code>!invoice 50000</code>  — Lightning deposit invoice
<code>!buynxt 10000</code>   — swap sats → NXT
<code>!stake 10000 30</code> — stake for 28% APY + WNUSD

Works on Damus, Amethyst, Snort — any NIP-04 compatible client.

⚡ Physics-based wallet. Censorship-proof addressing. Real yield.

👉 wnsp.io/nostr-bridge
#NXT #Nostr #Lightning #Bitcoin #NexusOS`,
    nostr: `🤖 Control your NexusOS wallet from Nostr DMs

Link your npub → wnsp.io/nostr-bridge
Then DM the bot:

!balance        → sats + NXT
!invoice 50000  → Lightning invoice
!buynxt 10000   → sats → NXT
!stake 10000 30 → 28% APY + WNUSD

Works on Damus, Amethyst, Snort.

Physics-based wallet. Censorship-proof. Real yield.

wnsp.io/nostr-bridge #NXT #Nostr #Lightning #NexusOS`,
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
🪙 Two live Bitcoin Runes: NEXUS•WAVELENGTH (952596:379) + WNSP•BTC (952733:1958)
🤖 AI Kernel — 6-phase boot, spectral authority bands
📡 Photonic computing roadmap — ~2032 hardware target

<b>Every NXT you hold is a stake in this mission.</b>

Buy NXT when BTC dips. Stake for yield. Fund hardware. Build civilisation.

👉 wnsp.io
#NexusOS #NXT #KardashevTypeI #WNUSD #Photonics #Bitcoin`,
    nostr: `🚀 NexusOS — Blueprint for a Kardashev Type I Civilisation

Kardashev Type I: full planetary energy harnessing.

NexusOS is the OS for that transition:

• WNSP — wavelength-based addressing (no DNS/IP)
• 25,600 photonic channels
• NXT — physics-priced, sats-settled
• WNUSD — stablecoin → hardware funding
• Bitcoin Runes: NEXUS•WAVELENGTH + WNSP•BTC (mainnet)
• AI Kernel — spectral authority bands
• Photonic hardware target ~2032

Every NXT = a stake in this mission.

Buy the dip. Stake. Fund hardware. Build civilisation.

wnsp.io #NexusOS #NXT #KardashevTypeI #WNUSD #Photonics`,
    tags: ["NexusOS","NXT","KardashevTypeI","WNUSD","Photonics","Bitcoin"],
  },
  {
    id: 6, label: "Ordinals — WNSP inscribed on Bitcoin", emoji: "🪬",
    telegram: `🪬 <b>NexusOS Physics — Permanently Inscribed on Bitcoin</b>

Every Bitcoin block is a permanent ledger. Every Ordinal inscription is immutable data — forever.

NexusOS has inscribed its core specifications onto the Bitcoin base layer via Ordinals:

📜 <b>WNSP Protocol spec</b> — wavelength-based addressing
🔮 <b>WavelengthScript Compiler α</b> — the language of photonic hardware
🌈 <b>25,600 Ψ channel map</b> — the Hilbert space routing table
🔬 <b>Compression State Theory</b> — the physics underpinning it all

<b>Why Ordinals?</b> The physics spec must outlast any server. Inscribed on Bitcoin it cannot be censored, altered, or deleted — guaranteed by proof-of-work.

NXT is the token that funds expansion of this inscribed civilisation OS.
1,000 sats = 1 NXT. Stack physics.

👉 wnsp.io/hardware-spec
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

wnsp.io/hardware-spec #Ordinals #Bitcoin #NXT #NexusOS #WNSP`,
    tags: ["Ordinals","Bitcoin","NXT","NexusOS","WNSP","Inscription"],
  },
  {
    id: 7, label: "Two live Bitcoin Runes", emoji: "🌈",
    telegram: `🌈 <b>NexusOS Has Two Live Bitcoin Runes on Mainnet</b>

Not one. Two. Both etched. Both permanent.

🔶 <b>NEXUS•WAVELENGTH</b> — Rune ID 952596:379
Open mint · 21 trillion total supply · 1,000 Ψ per mint · 100 NXT mint cost
The spectral wavelength token of the NexusOS ecosystem.

⚡ <b>WNSP•BTC</b> — Rune ID 952733:1958
100% premined · 21 billion supply · mirrors NXT exactly
The on-chain Bitcoin counterpart to the NXT physics token.

<b>Why Runes and not BRC-20?</b>
Runes live in Bitcoin's UTXO set — no inscription indexer, no ord node, no side-chain.
Every token is secured directly by Bitcoin proof-of-work. PSBT-compatible. Atomic-swap ready.

Both are AGPL-3.0. Both are live on Bitcoin mainnet.

Mint NEXUS•WAVELENGTH → wnsp.io/rune-mint
Full spec → wnsp.io/rune-etching

1,000 sats = 1 NXT · Stack physics.
#NexusWavelength #WnspBTC #Runes #Bitcoin #NXT #NexusOS`,
    nostr: `🌈 NexusOS has two live Bitcoin Runes on mainnet

NEXUS•WAVELENGTH — Rune ID 952596:379
Open mint · 21T supply · 1,000 Ψ per mint · 100 NXT cost

WNSP•BTC — Rune ID 952733:1958
100% premined · 21B supply · mirrors NXT exactly

Why Runes (not BRC-20)?
Runes live in Bitcoin's UTXO set — no side-chain, no indexer.
Every token secured by proof-of-work. PSBT + atomic-swap ready.

Both AGPL-3.0. Both live on mainnet.

Mint → wnsp.io/rune-mint

#NexusWavelength #WnspBTC #Runes #Bitcoin #NXT #NexusOS`,
    tags: ["NexusWavelength","WnspBTC","Runes","Bitcoin","NXT","NexusOS"],
  },
  {
    id: 8, label: "Developer API — build on the physics web", emoji: "🛠️",
    telegram: `🛠️ <b>Build on the Physics Web — NexusOS Developer API</b>

NexusOS now has a public developer API. Every call has a real wavelength, energy cost, and spectral address.

<b>What you can build:</b>
📡 CE-encode any text to a spectral fingerprint (λ, Ψ, energy)
🌈 Resolve spectral channels for any user — Ψ(wdm, oam, pol)
💰 Query physics-priced fee schedules — E=hf governs every action
📨 Send WNSP messages between spectral addresses
🪙 Query live rune metadata — NEXUS•WAVELENGTH + WNSP•BTC

<b>Install the SDK:</b>
<code>npm install nexusos-ce-encoder</code>
<code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code>

Both packages published. Bit-identical output. AGPL-3.0.

API key: 5,000 sats flat fee · no monthly subscription · pay per action with physics fees.

👉 wnsp.io/developer
#NexusOS #NXT #WNSP #API #Developer #Bitcoin`,
    nostr: `🛠️ Build on the Physics Web — NexusOS Developer API is live

Every API call has a real wavelength, energy cost, and spectral address.

Endpoints:
• GET /api/dev/ce-encode?text=… — spectral fingerprint for any text
• GET /api/dev/physics/:user — Ψ channel + fee schedule
• GET /api/dev/wallet — balance + transactions
• GET /api/dev/rune — live rune metadata
• POST /api/dev/message — send between spectral addresses

Install:
npm install nexusos-ce-encoder
pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py

API key: 5,000 sats flat fee. No subscription.

wnsp.io/developer #NexusOS #NXT #WNSP #API #Developer`,
    tags: ["NexusOS","NXT","WNSP","API","Developer","Bitcoin"],
  },
  {
    id: 10, label: "P2P transmission how-to", emoji: "📡",
    telegram: `📡 <b>How to Transmit Data Over the WNSP Spectral Network</b>

NexusOS has a working P2P data layer — no cloud, no DNS, no middlemen. Just physics.

<b>Step 1 — Go to the Transmission Console</b>
👉 wnsp.io/transmission

<b>Step 2 — Compose your payload</b>
Type any text or upload a file (video, image, binary).
NexusOS automatically CE-encodes your content to a unique wavelength λ and Ψ channel based on the actual data.

<b>Step 3 — Inspect the spectral analysis</b>
📊 Wavelength distribution (which λ bands your content occupies)
⚡ Total energy in Joules (E=hf per character)
💰 Estimated NXT cost (fee = base × E_sender / E_ref)

<b>Step 4 — Transmit</b>
Click <b>Transmit</b>. Watch your data propagate as photons through the simulated fibre channel.
On completion you receive a <b>Spectral Receipt</b> — a permanent on-chain ordinal recording your Ψ address, λ, timestamp, and content hash.

<b>Step 5 — Find your data</b>
Go to wnsp.io/spectral-workspace, tune to your wavelength, and retrieve it.
Anyone with the λ address can find your transmission. No account required to read.

This is not a simulation of what's coming — it's the architecture running today on silicon, ready to migrate to photonic hardware in ~2032. No rewrite needed.

👉 wnsp.io/transmission
#NexusOS #P2P #WNSP #Photonics #Transmission #Bitcoin`,
    nostr: `📡 How to transmit data over the WNSP spectral network — step by step

NexusOS has a working P2P data layer. No cloud. No DNS. No middlemen.

Step 1 → wnsp.io/transmission
Step 2 → Type text or upload a file. NexusOS CE-encodes it to a unique wavelength λ and Ψ(wdm,oam,pol) channel.
Step 3 → Inspect the spectral analysis: wavelength distribution, total energy E=hf, estimated NXT fee.
Step 4 → Click Transmit. Your data propagates as photons. On completion: Spectral Receipt — permanent on-chain ordinal with your λ, Ψ, and content hash.
Step 5 → Retrieve at wnsp.io/spectral-workspace — tune to your wavelength.

25,600 orthogonal channels. Physics addressing. No account required to read.

This architecture runs on silicon today. Migrates to photonic hardware ~2032. Zero rewrite.

wnsp.io/transmission #NexusOS #P2P #WNSP #Photonics`,
    tags: ["NexusOS","P2P","WNSP","Photonics","Transmission","Bitcoin"],
  },
  {
    id: 11, label: "Blockchain owner recruitment", emoji: "🏗️",
    telegram: `🏗️ <b>Looking for Blockchain Developers — Owners, Not Employees</b>

NexusOS is a physics-based operating system built on Λ=hf/c². The blockchain is live. The hardware specification is published (AGPL-3.0).

My focus is hardware manufacturing — building the PHR-1 resonator, the first physical photonic computing unit. I need builders who want to <b>own the blockchain, not earn from it as a contractor</b>.

<b>What you'd be building:</b>
• The WNSP physics-based consensus layer (wavelength-validated blocks, not hash-based)
• NXT token economics (21 billion supply, 8 decimals, physics-fee model)
• Wallet + governance infrastructure (11 live protocol parameters, spectral authority bands)
• P2P mesh networking layer

<b>What ownership means:</b>
• Protocol revenue share — not a salary
• Token allocation from orbital treasury
• Full architectural authority over the chain
• Your name on a specification that will run on photonic hardware ~2032

<b>The hardware funding model:</b>
Blockchain liquidity → platform revenue → hardware manufacturing. The chain funds the hardware. The hardware validates the chain in silicon photonics. Circular.

📄 Full hardware spec: wnsp.io/hardware-spec
🔗 Live system: wnsp.io
💬 Reach out: @wnsptech on X

If you want to build something that will outlast every software system alive today — this is it.

#NexusOS #Blockchain #Bitcoin #OpenSource #Photonics #Hiring`,
    nostr: `🏗️ Looking for blockchain developers who want to be owners — not employees.

NexusOS is a physics-based OS built on Λ=hf/c². The blockchain is live. The hardware spec is published (AGPL-3.0).

My focus is hardware manufacturing — the PHR-1 resonator (first physical photonic computing unit). I need builders who want protocol revenue, not a salary.

What you'd own:
→ WNSP physics-based consensus layer (wavelength-validated blocks, not hash)
→ NXT token economics (21B supply, 8 decimals, physics-fee model)
→ Wallet + governance infrastructure
→ P2P mesh networking layer

What ownership means:
→ Protocol revenue share (not a salary)
→ Token allocation from orbital treasury
→ Full architectural authority over the chain
→ Your name on a spec running on photonic hardware ~2032

The model: blockchain liquidity → platform revenue → hardware manufacturing. The chain funds the hardware. The hardware validates the chain in silicon photonics.

Hardware spec: wnsp.io/hardware-spec
Live system: wnsp.io
DM: @wnsptech on X

#NexusOS #Blockchain #Bitcoin #OpenSource #Photonics`,
    tags: ["NexusOS","Blockchain","Bitcoin","OpenSource","Photonics","Hiring"],
  },
];

// ── Telegram channel sender ───────────────────────────────────────────────────
async function sendTelegram(text: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };

  // @troglodytememe (wnsp.io channel) — confirmed numeric ID
  const chatId = "-1002572762871";

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

// ── Discord webhook sender ────────────────────────────────────────────────────
async function sendDiscord(text: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return { ok: false, error: "DISCORD_WEBHOOK_URL not set" };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "NexusOS",
        avatar_url: "https://wnsp.io/nexusos-icon.png",
        content: text.replace(/<b>(.*?)<\/b>/g, "**$1**").replace(/<[^>]+>/g, ""),
      }),
    });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    return { ok: true };
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
      tags:    slot.tags.map(t => ["t", t]),
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
}): Promise<{ tg: any; nostr: any; discord: any }> {
  const tags = opts.hashtags.map(t => `#${t}`).join(" ");
  const tgText      = `${opts.emoji} <b>${opts.title}</b>\n\n${opts.body}\n\n${tags}`;
  const nostrText   = `${opts.emoji} ${opts.title}\n\n${opts.body}\n\n${tags}`;
  const discordText = `${opts.emoji} **${opts.title}**\n\n${opts.body}\n\n${tags}`;

  const slot: Slot = {
    id: -1, label: opts.title, emoji: opts.emoji,
    telegram: tgText, nostr: nostrText, tags: opts.hashtags,
  };

  const [tgRes, nsRes, dcRes] = await Promise.allSettled([
    sendTelegram(tgText),
    sendNostr(slot),
    sendDiscord(discordText),
  ]);

  const tg      = tgRes.status === "fulfilled" ? tgRes.value : { ok: false, error: String((tgRes as any).reason) };
  const nostr   = nsRes.status === "fulfilled" ? nsRes.value : { ok: false, error: String((nsRes as any).reason) };
  const discord = dcRes.status === "fulfilled" ? dcRes.value : { ok: false, error: String((dcRes as any).reason) };

  console.log(`${TAG} EventBroadcast "${opts.title}" — tg:${tg.ok} nostr:${nostr.ok} discord:${discord.ok}`);
  return { tg, nostr, discord };
}

export async function fireCampaignSlot(slotIndex?: number): Promise<{ slot: Slot; tg: any; nostr: any }> {
  const idx  = slotIndex ?? (_state.slotIndex % SLOTS.length);
  const slot = SLOTS[idx];

  console.log(`${TAG} Firing slot ${idx} — "${slot.label}"`);

  const discordText = `${slot.emoji} **${slot.label}**\n\n${slot.telegram.replace(/<b>(.*?)<\/b>/g, "**$1**").replace(/<[^>]+>/g, "")}`;

  const [tg, ns, dc] = await Promise.allSettled([
    sendTelegram(slot.telegram),
    sendNostr(slot),
    sendDiscord(discordText),
  ]);

  const tgRes    = tg.status === "fulfilled" ? tg.value : { ok: false, error: String(tg.reason) };
  const nsRes    = ns.status === "fulfilled" ? ns.value : { ok: false, error: String(ns.reason) };
  const dcRes    = dc.status === "fulfilled" ? dc.value : { ok: false, error: String(dc.reason) };
  const anyOk    = tgRes.ok || nsRes.ok || dcRes.ok;
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

  console.log(`${TAG} Slot ${idx} done — TG:${tgRes.ok ? "✓" : "✗"} Nostr:${nsRes.ok ? "✓" : "✗"} Discord:${dcRes.ok ? "✓" : "✗"}`);
  return { slot, tg: tgRes, nostr: nsRes, discord: dcRes };
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

  const nostrOk = !!process.env.NOSTR_NSEC;
  _state.channels = [
    process.env.TELEGRAM_BOT_TOKEN ? `Telegram → @troglodytememe (wnsp.io)` : null,
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
