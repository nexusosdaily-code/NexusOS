---
name: WNSP Physics Sequence
description: 8-act NexusOS physics sequence — acts, routes, equations, disclosure dates
---

## The 8-Act Sequence

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

## Ghost Node Physics
- Ghost node n=36 at 169.33 u — no stable nucleus (binding energy mass defect)
- Tm (Z=69, 4f¹³): n=35.9966, gap=−0.0034 octaves below n=36
- Yb (Z=70, 4f¹⁴): n≈36.07, gap=+0.07 octaves above n=36
- n=35 is near-occupied: Kr (−0.015), Rb (+0.012) — narrow gap only

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
