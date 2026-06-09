/**
 * One-shot broadcast: WNSP analytics announcement
 * Run: npx tsx server/broadcast-analytics.ts
 */

import * as fs from "fs";
import * as path from "path";
import { publishToNostr } from "./nostr-service";

const IMAGE_PATH = path.resolve("attached_assets/Screenshot_20260608_200923_Replit_1780920648897.jpg");

const TG_CAPTION =
`📡 <b>Something just happened.</b>

We checked our analytics. "wnsp" is showing as a <b>browser</b> — 613 sessions.

Not Chrome. Not Safari. <b>WNSP.</b>

External systems are hitting NexusOS using the WNSP protocol as their user agent. The protocol is being treated as infrastructure, not a website.

🌍 <b>Traffic breakdown:</b>
🇳🇿 New Zealand — 2,705
🇺🇸 United States — 1,202
🇲🇽 Mexico — 1,082

The tech is out of the bag.

🔗 <a href="https://wnsp.tech">wnsp.tech</a>
#WNSP #NexusOS #NXT #Bitcoin #Physics`;

const NOSTR_NOTE =
`📡 Something just happened.

We checked our analytics. "wnsp" is showing as a browser — 613 sessions.

Not Chrome. Not Safari. WNSP.

External systems are hitting NexusOS using the WNSP protocol as their user agent. The protocol is already being treated as infrastructure, not a website.

🌍 Traffic:
🇳🇿 New Zealand — 2,705
🇺🇸 United States — 1,202
🇲🇽 Mexico — 1,082

The tech is out of the bag.

wnsp.tech

#WNSP #NexusOS #NXT #Bitcoin #Physics #Nostr`;

async function sendTelegramPhoto() {
  const token     = process.env.TELEGRAM_BOT_TOKEN;
  // @troglodytememe (wnsp.tech channel) — confirmed numeric ID
  const channelId = "-1002572762871";
  if (!token) { console.error("[TG] Missing TELEGRAM_BOT_TOKEN"); return; }

  const buf  = fs.readFileSync(IMAGE_PATH);
  const blob = new Blob([buf], { type: "image/jpeg" });
  const form = new FormData();
  form.append("chat_id",    channelId);
  form.append("caption",    TG_CAPTION);
  form.append("parse_mode", "HTML");
  form.append("photo",      blob, "analytics.jpg");

  const res  = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
  const json = await res.json();
  if (json.ok) {
    console.log("[TG] ✓ Photo posted to channel — message_id:", json.result?.message_id);
  } else {
    console.error("[TG] ✗ Failed:", json.description);
    // fallback: text only
    const r2 = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channelId, text: TG_CAPTION, parse_mode: "HTML" }),
    });
    const j2 = await r2.json();
    console.log(j2.ok ? "[TG] ✓ Text fallback sent" : "[TG] ✗ Text fallback also failed:", j2.description);
  }
}

async function sendNostrNote() {
  try {
    const result = await publishToNostr({
      content:  NOSTR_NOTE,
      hashtags: ["WNSP", "NexusOS", "NXT", "Bitcoin", "Physics", "Nostr"],
    });
    console.log(`[Nostr] ✓ Published — id: ${result.id}`);
    console.log(`[Nostr]   relays: ${result.relays.join(", ")}`);
  } catch (e: any) {
    console.error("[Nostr] ✗ Failed:", e.message);
  }
}

(async () => {
  console.log("[Broadcast] 🚀 Firing WNSP analytics announcement…");
  await Promise.all([sendTelegramPhoto(), sendNostrNote()]);
  console.log("[Broadcast] ✓ Done");
  process.exit(0);
})();
