---
name: Replit AI R&D Account
description: The test account formally designated as Replit's AI agent account for NexusOS R&D — founder-confirmed 2026-06-21.
---

# Replit AI R&D Account

**Canonical address:** `wnsp://Ψ(52,20,H)/test`
**User ID:** `8dc7f7e6-44b1-4b34-aa81-3ad33c550a1d`
**Registry ID:** `eb4b0c07-f8c5-42e6-bff4-81132cee998c`
**Role:** `ai_agent`
**Designated by:** Te Rata Pou (founder), 2026-06-21

**Why:** Founder verbally confirmed this account is Replit's AI account for NexusOS research, AI agent development, and protocol testing going forward.

**How to apply:**
- Never reassign this address or user ID without explicit founder approval.
- The `seedReplitAIAccount()` function in `server/genesis_user.ts` runs on every boot and enforces the role + description idempotently — both dev and production.
- Description stored in `wnsp_registry`: "Replit AI R&D Account — designated by Te Rata Pou (founder) on 2026-06-21. Reserved for NexusOS research, AI agent development, and protocol testing. Do not reassign without founder approval."
