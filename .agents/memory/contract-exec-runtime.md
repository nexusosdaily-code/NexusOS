---
name: Contract execution runtime
description: How server-side WavelengthScript VM execution works — tables, routes, side-effect pattern
---

## Pattern
`runToHalt()` in `server/wnsp_vm.ts` is synchronous (10,000-cycle cap). Route handler calls it, persists to `contract_executions`, writes a zero-value blockchain_tx_pool record, then calls `fireEffects()` as non-blocking promise.

## Side-effects (fireEffects)
- AGENT_REGISTER → POST http://localhost:5001/api/wnsp/agent/allocate + INSERT wnsp_kernel_events
- KERNEL_EMIT → INSERT wnsp_kernel_events (event_type='CONTRACT_EMIT')
- KERNEL_BROAD → INSERT wnsp_kernel_events (event_type='CONTRACT_BROAD')
- All errors caught + logged; never throws; AbortSignal.timeout(3000) guards Python call

## Routes
- `POST /api/app/:slug/run` — public, no auth
- `GET /api/app/:slug/executions` — public
- `GET /api/contracts/:id/executions` — authenticated

## Pitfall
`parseInt(...) || 42` collapses channel_load=0 to 42 (falsy bug). Correct pattern:
`const rawLoad = parseInt(body.channel_load ?? "42"); const load = isNaN(rawLoad) ? 42 : clamp(rawLoad, 0, 100);`

**Why:** `0` is falsy in JS; `|| default` should never be used for numeric inputs that may legitimately be 0.
