/**
 * One-shot launch announcement for WNSP•BTC
 * Run: npx tsx server/scripts/fire-launch-announcement.ts
 */
const TXID = "8e1614818d96e494bbde4d90b57ef7ce596aebee50b15b48c132ed8ece3ae11c";

const launchMsgTg =
  `⚡ <b>WNSP•BTC IS LIVE ON BITCOIN</b> ⚡\n\n` +
  `The <b>NEXUS•WAVELENGTH BTC Rune</b> has been etched on Bitcoin mainnet.\n\n` +
  `🔷 Ticker:   <b>WNSP•BTC</b>\n` +
  `🔷 Symbol:   <b>Ψ</b> (Psi — the spectral channel operator)\n` +
  `🔷 Supply:   <b>21,000,000,000</b> (21 billion, 8 decimals)\n` +
  `🔷 Premine:  100% — no open minting, no rug\n` +
  `🔷 Protocol: NexusOS Physics Stack (WNSP)\n\n` +
  `<b>What is WNSP•BTC?</b>\n` +
  `WNSP•BTC is the on-chain representation of the NEXUS•WAVELENGTH spectral token — a physics-native digital asset built on the Theory of Compression States. ` +
  `Every unit maps to an orthogonal Hilbert-space channel (Ψ), bridging photonic computing with Bitcoin's settlement layer.\n\n` +
  `📈 <b>Trade &amp; track:</b>\n` +
  `• UniSat Fractal → https://fractal.unisat.io/runes\n` +
  `• Magic Eden → https://magiceden.us/ordinals/runes\n` +
  `• ord.io → https://ord.io\n\n` +
  `🌐 <b>NexusOS:</b> https://wnsp.io\n` +
  `🔗 Etch TX: <code>${TXID}</code>\n` +
  `🔗 <a href="https://mempool.space/tx/${TXID}">View on mempool.space</a>\n\n` +
  `#WNSPBTC #Bitcoin #Runes #NexusOS #PhotonicComputing`;

const launchMsgNostr =
  `⚡ WNSP•BTC IS LIVE ON BITCOIN ⚡\n\n` +
  `The NEXUS•WAVELENGTH BTC Rune has been etched on Bitcoin mainnet.\n\n` +
  `Ticker:  WNSP•BTC\n` +
  `Symbol:  Ψ (Psi — spectral channel operator)\n` +
  `Supply:  21,000,000,000 (21 billion, 8 decimals)\n` +
  `Premine: 100% — no open minting\n\n` +
  `WNSP•BTC maps to orthogonal Hilbert-space channels on the NexusOS physics stack — bridging photonic computing with Bitcoin's settlement layer.\n\n` +
  `Trade: https://fractal.unisat.io/runes\n` +
  `App:   https://wnsp.io\n` +
  `TX:    ${TXID}\n\n` +
  `#WNSPBTC #Bitcoin #Runes #NexusOS #Nostr`;

async function main() {
  // ── Telegram channel ──────────────────────────────────────────────────────
  const token     = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (token && channelId) {
    console.log("📢 Posting to Telegram channel…");
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    channelId,
        text:       launchMsgTg,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
    const body = await res.json() as any;
    if (body.ok) {
      console.log(`✅ Telegram channel post sent — message_id: ${body.result.message_id}`);
    } else {
      console.error("❌ Telegram failed:", JSON.stringify(body));
    }
  } else {
    console.warn("⚠️  TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set — skipping.");
  }

  // ── Nostr note ────────────────────────────────────────────────────────────
  console.log("\n🔮 Publishing to Nostr…");
  try {
    const { publishToNostr } = await import("../nostr-service.js");
    const result = await publishToNostr({
      content: launchMsgNostr,
      tags: [
        ["t", "WNSPBTC"],
        ["t", "Bitcoin"],
        ["t", "Runes"],
        ["t", "NexusOS"],
        ["r", `https://mempool.space/tx/${TXID}`],
        ["r", "https://wnsp.io"],
      ],
    });
    console.log(`✅ Nostr note published — id: ${result.id}`);
    console.log(`   Relays: ${result.relays.join(", ")}`);
  } catch (e: any) {
    console.error("❌ Nostr failed:", e.message);
  }

  console.log("\n🚀 Launch announcement complete.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
