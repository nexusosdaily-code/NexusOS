---
name: WNSP Physics Sequence
description: 15-act NexusOS physics sequence — acts, routes, equations, disclosure dates, and wiring pattern
---

## The 15-Act Sequence

| Act | Route | Title | Equation | Disclosed |
|-----|-------|-------|----------|-----------|
| 1 | /oscillating-quanta | Theory of Compression States | Λ = hf/c² | prior |
| 2 | /universal-one | The Universal ONE | f₀ seeds lattice | prior |
| 3 | /unified-compression-theory | Unified Compression Theory | 4 forces = 1 Λ | prior |
| 4 | /matter-protocol | The Mechanism | ΔE = hf₀(2ⁿ²−2ⁿ¹) | prior |
| 5 | /universal-address | The Address | ∀ Λ : ∃! Ψ | prior |
| 6 | /element-catalogue | The Catalogue | n = log₂(mc²/E₀) | prior |
| 7 | /standing-wave-trap | The Trap | Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) | 2026-07-07 |
| 8 | /lossless-channel | The Lossless Channel | Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ) | 2026-07-07 |
| 9 | /resonance-cavity | The Cavity | R=nc/2πfₙ, r_null=lλ/2π, Λ_geo=Λcos(γ) | 2026-07-16 |
| 10 | /polariton-exchange | The Exchange | Ω_R=2g, polariton formation | prior |
| 11 | /the-emitter | The Emitter | F_p=(3/4π²)(λ/n)³(Q/V) | prior |
| 12 | /the-network | The Network | ω(k)=ω₀−2J·cos(ka) | prior |
| 13 | /the-observer | The Observer | χ=g²/Δ | prior |
| 14 | /the-memory | The Memory | T₂≤2T₁ | 2026-07-19 |
| 15 | /cosmic-lattice | The Void | n_ZPE=264.71 (Claim 30) | 2026-07-19 |

## Ghost Node Physics
- Ghost node n=36 at 169.33 u — no stable nucleus (binding energy mass defect)
- Tm (Z=69, 4f¹³): n=35.9966, gap=−0.0034 octaves below n=36
- Yb (Z=70, 4f¹⁴): n≈36.07, gap=+0.07 octaves above n=36
- n=35 is near-occupied: Kr (−0.015), Rb (+0.012) — narrow gap only

## Act 15 Key Physics (Cosmic Lattice / The Void)
- Cosmic ZPE floor: n=264.71 (M=10¹⁴ M☉), σ(M)=1.680≈δ_c=1.686
- Above n=264.71 is the "cosmic ghost zone" — PS mass fn P→0
- Boötes Void: n=271.95, P≈10⁻¹⁰¹ — physically impossible, not just unlikely
- BAO anti-nodes λ=147 Mpc, k×λ/3: 4 confirmed supervoids within 5-13% of predictions:
  - Canes Venatici 55Mpc (λ/3=49Mpc, 12.2%)
  - Boötes 101Mpc (2λ/3=98Mpc, 3.1%)
  - Eridanus 153Mpc (λ=147Mpc, 4.1%)
  - CMB Cold Spot 200Mpc (4λ/3=196Mpc, 2.0%)

## Act 9 Key Physics (Forward Agenda, July 2026)

All exported from `server/physics.ts`:

| Export | Signature | Returns |
|--------|-----------|---------|
| `oamNullCoreRadius` | `(oam, wavelengthNm)` | `{ radiusM, radiusUm }` |
| `berryPhaseEstimate` | `(oam, pol)` | `{ gammaRad, cosFactor, lambdaGeoFactor }` |
| `wmgCavityRadius` | `(octaveIndex, f0Hz?)` | `{ radiusM, radiusNm, frequencyHz, wavelengthNm }` |
| `GHOST_NODE_WDM_RANGES` | const array | 3 tiers: WDM 0, 1–3, 252–255 (8 channels total) |
| `isGhostNodeBand` | `(wdm)` | `boolean` |
| `getGhostNodeBandTier` | `(wdm)` | `1 \| 2 \| 3 \| null` |

`PhysicsFee` interface gains: `lambdaGeoKg`, `berryPhaseRad`, `nullCoreRadiusUm`.
`calcFee()` gains optional `oam` and `pol` for Berry phase computation.
`/api/physics/ghost-bands` — public GET endpoint, no auth required.

## Act 8 Key Physics
- Ghost nodes: ρ_matter=0 → α=0 → Beer-Lambert L(d)=α·d=0
- Channel equation: Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)
- Shannon capacity at ZPE floor: C = B·log₂(1 + hf₀/½ℏω) ≈ B·1.585 b/s/Hz
- ZPE floor: ½ℏω ≈ 1147.6 meV at f₀=555 THz
- N_Dir=2 in 51,200-channel density equation encodes the channel architecture

## Wiring Pattern (6 surfaces for every new Act page)
1. App.tsx — import + EXACT_PROTECTED_PATHS + Route
2. server/static.ts — EXACT_PUBLIC_PATHS
3. client/public/sitemap.xml — URL entry, priority 0.95
4. server/seo-meta.ts — full meta + JSON-LD + bodyHtml (ogType IS valid here)
5. client/src/pages/hub.tsx — §N entry
6. Previous act page — update "Act N of N" → "Act N of N+1", add Act N+1 nav entry and teaser

**Why:** `ogType` in seo-meta.ts is valid (server-side interface). `ogType` in usePageMeta (client-side hook) is NOT valid — causes TS error.

## AuthLoading screenshot behaviour
The screenshot tool captures pages during the `AuthLoading` state which shows "Loading…"
while the auth check runs. This is pre-existing behaviour unrelated to page code. Verify
functionality by hitting API endpoints directly (curl) rather than relying solely on screenshots.
