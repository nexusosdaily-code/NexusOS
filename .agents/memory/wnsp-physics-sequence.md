---
name: WNSP Physics Sequence
description: 17-act NexusOS physics sequence — acts, routes, equations, disclosure dates, and wiring pattern
---

## The 17-Act Sequence

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
| 9 | /resonance-cavity | The Cavity | R=nc/2πfₙ, r_null=lλ/2π | 2026-07-16 |
| 10 | /polariton-exchange | The Exchange | Ω_R=2g, polariton formation | prior |
| 11 | /the-emitter | The Emitter | F_p=(3/4π²)(λ/n)³(Q/V) | prior |
| 12 | /the-network | The Network | ω(k)=ω₀−2J·cos(ka) | prior |
| 13 | /the-observer | The Observer | χ=g²/Δ | prior |
| 14 | /the-memory | The Memory | T₂≤2T₁ | 2026-07-19 |
| 15 | /cosmic-lattice | The Void | n_ZPE=264.71 (Claim 30) | 2026-07-19 |
| 16 | /the-entangler | The Entangler | |Φ⁺⟩=(|00⟩+|11⟩)/√2 (Claim 31) | 2026-07-19 |
| 17 | /the-field | The Field | [â,â†]=1, ℋ=ℏω(â†â+½) (Claim 32) | 2026-07-20 |

## Act 17 Key Physics (The Field)
- Primordial commutation: [â, â†] = 1
- Hamiltonian: ℋ = ℏω(â†â + ½)
- ZPE = ½hf₀ = 1.148 eV at f₀ = 555 THz
- E₀ = hf₀ = 2.295 eV (seed energy for octave ladder)
- Fock ladder: E_n = hf₀(n + ½); â†|n⟩ = √(n+1)|n+1⟩; â|0⟩ = 0
- Claim 32: each of 51,200 Ψ(wdm,oam,pol) channels is a single-mode bosonic field quantised by [â,â†]=1
- The vacuum state |0⟩ at f₀ is the pre-condition for Act 1's first oscillation
- Color: amber #f59e0b

## Ghost Node Physics
- Ghost node n=36 at 169.33 u — no stable nucleus (binding energy mass defect)
- Tm (Z=69, 4f¹³): n=35.9966, gap=−0.0034 octaves below n=36
- Yb (Z=70, 4f¹⁴): n≈36.07, gap=+0.07 octaves above n=36
- n=35 is near-occupied: Kr (−0.015), Rb (+0.012) — narrow gap only

## Act 16 Key Physics (The Entangler)
- Bell states: |Φ⁺⟩=(|00⟩+|11⟩)/√2, |Φ⁻⟩=(|00⟩−|11⟩)/√2, |Ψ⁺⟩=(|01⟩+|10⟩)/√2, |Ψ⁻⟩=(|01⟩−|10⟩)/√2
- Entanglement swapping: |Φ⁺⟩_AB ⊗ |Φ⁺⟩_BC → BSM(B) → |Φ⁺⟩_AC
- CHSH: S ≤ 2 (classical), S ≤ 2√2 (Tsirelson), loophole-free violations confirmed 2015
- Repeater scaling: without SNIC: F ∝ e^(−L/L_att); with n SNIC swap nodes: L_total = n×L₀
- Claim 31: SNIC nodes as BSM-capable quantum repeater switch points using Ψ(wdm,oam,pol) address space

## Act 15 Key Physics (Cosmic Lattice / The Void)
- Cosmic ZPE floor: n=264.71 (M=10¹⁴ M☉), σ(M)=1.680≈δ_c=1.686
- BAO anti-nodes λ=147 Mpc, k×λ/3: 4 confirmed supervoids within 5-13% of predictions

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

## Wiring Pattern (6 surfaces for every new Act page)
1. App.tsx — import + EXACT_PROTECTED_PATHS + Route
2. server/static.ts — EXACT_PUBLIC_PATHS
3. client/public/sitemap.xml — URL entry, priority 0.95
4. server/seo-meta.ts — full meta + JSON-LD + bodyHtml (ogType IS valid here)
5. client/src/pages/hub.tsx — §N entry
6. Previous act page — update "Act N of N" → "Act N of N+1", add Act N+1 nav entry and teaser

**Why:** `ogType` in seo-meta.ts is valid (server-side interface). `ogType` in usePageMeta (client-side hook) is NOT valid — causes TS error.

## Cross-link Pattern for New Acts
- Acts 1–6: inline `ACT_NAV` array — add `{ act: "ACT N", title, sub, href }` after Act 16 entry
- Acts 7–10: explicit Link block after Act 16 rose Link, before `</div></div>` — indent varies (14-space for top navs, 12-space for bottom nav in polariton-exchange)
- Acts 11–14: explicit Link block at end of SequenceNav component, before `</div></div>` — 8-space indent
- Act 15 cosmic-lattice: explicit Link block after "← HERE" div, before grid `</div>` — 8-space indent
- Act 16 the-entangler: explicit Link block after "← HERE" div, before grid `</div>` — 8-space indent
- polariton-exchange has TWO navs (top: 14-space inner, bottom: 12-space) — both must be updated

## AuthLoading screenshot behaviour
The screenshot tool captures pages during the `AuthLoading` state which shows "Loading…"
while the auth check runs. This is pre-existing behaviour unrelated to page code. Verify
functionality by checking server logs for absence of errors rather than relying on screenshots.

## SAST scan infrastructure note
`runSastScan()` via code_execution has intermittently returned CANCEL errors (not code failures).
Dependency audit and HoundDog still work. If SAST keeps canceling, skip with reason and note
it is an environment issue, not a code security issue.
