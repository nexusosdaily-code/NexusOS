---
name: Telegram campaign — chat ID and fire pattern
description: How to send to the NexusOS Telegram channel and why the env var @username format fails
---

## Confirmed channel numeric ID
`-1002572762871` — this is `@troglodytememe` (the wnsp.io community channel).

**Why:** `TELEGRAM_CHANNEL_ID` env var stores an `@username` format that intermittently fails
with "chat not found" even though the bot is admin. Always use the hardcoded numeric ID.
It is already set correctly in `sendTelegram()` in `server/nxt-campaign-agent.ts`.
Any one-shot fire scripts must also use this numeric ID — NOT the env var.

## Campaign scheduler
- Starts automatically via `startNxtCampaignAgent()` called in `server/index.ts`
- Default interval: 4 hours (configurable via `NXT_CAMPAIGN_INTERVAL_MS`)
- Disable: set `NXT_CAMPAIGN_DISABLED=true`
- 15 rotating slots (ids 0–15, skipping 9) covering: BTC dip, staking, WNUSD, physics intro,
  Nostr bot, K1 mission, Ordinals, Runes, Dev API, P2P, blockchain ownership,
  WavelengthScript, curl API, Ψ channel explainer, CE→SE→bytecode pipeline
- Channel count in all slots is 51,200 (256 WDM × 50 OAM × 2 pol × 2 N_Dir) — updated Aug 2026
- Slot pointer was always resetting to 0 on restart — fixed: `resumeSlotIndex()` reads
  last-sent slot from `campaign_log` table on boot and advances by one

## One-shot fire scripts
Pattern for any new one-shot announcement (in `server/scripts/`):
```ts
const token   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = "-1002572762871";   // always use numeric, not env @username
// ... build tgMsg as HTML, nostrMsg as plain text
// Telegram: fetch https://api.telegram.org/bot${token}/sendMessage
// Nostr:    import publishToNostr from ../nostr-service.js
```

## campaign_log table columns
`id, slot, channel, status, error_msg, sent_at, nostr_event_id, telegram_msg_id`
(No `result` column — don't try to SELECT it)
