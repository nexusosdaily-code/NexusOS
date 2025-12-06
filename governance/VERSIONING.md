# NexusOS Version Policy

**Version:** 1.0.0  
**Effective:** December 3, 2025  
**Status:** MAINNET CANONICAL

---

## Mainline Definition

### WNSP v7.x IS THE MAINLINE

```
┌─────────────────────────────────────────────────────────────┐
│                    NexusOS MAINLINE                         │
│                                                             │
│  Repository: github.com/nexusosdaily-code/WNSP-P2P-Hub     │
│  Branch:     main                                           │
│  Version:    WNSP v7.x                                      │
│  Status:     MAINNET READY                                  │
│                                                             │
│  Features:                                                  │
│  ├── 7-band spectral authority (NANO → PLANCK)             │
│  ├── Lambda Boson substrate (Λ = hf/c²)                    │
│  ├── Constitutional enforcement                             │
│  ├── BHLS floor @ 1,150 NXT/month                          │
│  ├── Layer 1 blockchain + Layer 2 DEX                       │
│  └── Full PWA + Mobile API                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Version Numbering

NexusOS follows Semantic Versioning with physics constraints:

```
MAJOR.MINOR.PATCH[-MODIFIER]

Example: 7.2.1-mainnet
```

### Version Components

| Component | Meaning | Authority Required | Upgrade Category |
|-----------|---------|-------------------|------------------|
| **MAJOR** | Spectral band or constitutional changes | PLANCK | Constitutional |
| **MINOR** | New features, API additions | ZEPTO | Standard |
| **PATCH** | Bug fixes, optimizations | ATTO | Minor |
| **MODIFIER** | Release stage indicator | None | — |

**Version-to-Category Mapping:**
- Semantic `MAJOR` (e.g., v7→v8) = Constitutional upgrade (PLANCK) — 90-day voting
- Semantic `MINOR` (e.g., v7.1→v7.2) = Standard upgrade (ZEPTO) — 14-day voting  
- Semantic `PATCH` (e.g., v7.1.0→v7.1.1) = Minor upgrade (ATTO) — 7-day voting

**Note:** See UPGRADE_PROTOCOL.md for complete upgrade lifecycle and DEVELOPER_COUNCIL.md for proposal categories.

### Modifiers

| Modifier | Meaning |
|----------|---------|
| `-alpha` | Experimental, unstable |
| `-beta` | Feature complete, testing |
| `-rc` | Release candidate |
| `-mainnet` | Production ready |
| (none) | Stable release |

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| v1.x | 2025 | Archived | Initial prototype |
| v2.x | 2025 | Archived | Basic DAG implementation |
| v3.x | 2025 | Archived | GhostDAG consensus |
| v4.x | 2025 | Archived | Spectral encoding |
| v5.x | 2025 | Archived | PoSPECTRUM consensus |
| v6.x | 2025 | Archived | Constitutional framework |
| **v7.x** | 2025 | **MAINLINE** | Lambda Boson substrate |

---

## Branch Strategy

### Protected Branches

```
main                    ← MAINLINE (v7.x production)
├── develop             ← Integration branch
├── release/v7.x.x      ← Release preparation
└── hotfix/xxx          ← Critical fixes
```

### Experimental Branches

```
experimental/           ← Experimental features
├── quantum-consensus   ← Research: new consensus
├── v8-prototype        ← Next major version R&D
└── community/xxx       ← Community experiments
```

---

## Upgrade Paths

### Within v7.x (Backward Compatible)

```
v7.0.0 → v7.1.0 → v7.2.0 → ...
         ↓
    Automatic upgrade
    No breaking changes
    Constitution preserved
```

### Major Version (v7 → v8)

```
v7.x.x → v8.0.0
         ↓
    PLANCK consensus required
    Migration path provided
    6-month transition period
    Constitution MUST be preserved
```

---

## Derivative Branches

Derivatives MUST declare their relationship to mainline:

| Type | Naming | Requirements |
|------|--------|--------------|
| **Compatible** | NexusOS-[Name] | All 7 fork requirements |
| **Experimental** | NexusOS-Experimental-[Name] | Clearly labeled |
| **Incompatible** | [OtherName] | Cannot use "NexusOS" |

### Example Naming

```
✅ NexusOS-Mars          (Compatible, geographic variant)
✅ NexusOS-Academic      (Compatible, educational focus)
✅ NexusOS-Experimental-v8   (Experimental, next version)
✅ SpectrumChain         (Incompatible, different physics)

❌ NexusOS-Lite          (Violates BHLS floor)
❌ NexusOS-NoConstitution (Removes clauses)
❌ NexusOS-Centralized   (Violates Non-Dominance)
```

---

## Long-Term Support (LTS)

| Version | LTS Status | Support Until |
|---------|------------|---------------|
| v7.x | Current LTS | Until v9.0 + 12 months |
| v6.x | Legacy | December 2025 |
| v5.x and below | Unsupported | — |

---

## Version Verification

Check your version against mainline:

```python
from governance.enforcer import ConstitutionalEnforcer

enforcer = ConstitutionalEnforcer()
result = enforcer.verify_mainline_compatibility()

if result.compatible:
    print("✅ Compatible with mainline v7.x")
else:
    print(f"❌ Incompatible: {result.violations}")
```

---

## API Versioning

### Mobile API
```
/api/v2.0/...     ← Current
/api/v1.0/...     ← Deprecated, removal Q2 2025
```

### Governance API
```
/api/governance/v1/...   ← Current
```

---

*"Version numbers are not arbitrary. They encode the physics evolution of NexusOS."*
