# NexusOS Photonic Hardware Specification v1.0
**WNSP Physics Stack — Reference Architecture**

Copyright (C) 2026 NexusOS / nexusosdaily-code  
Licence: GNU Affero General Public License v3.0 (AGPL-3.0)  
Repository: https://github.com/nexusosdaily-code/NexusOS  
Date of first publication: 2026-05-16  

> This document is part of the NexusOS codebase and is protected under the GNU Affero General Public
> License v3.0. Any implementation, derivative, or adaptation of the hardware architectures described
> herein must be released under the same AGPL-3.0 licence and must credit NexusOS as the originating
> specification. This includes firmware, HDL/VHDL/Verilog implementations, photonic mask layouts,
> and any software stack designed to interface with these hardware components.

---

## Overview

This document specifies four interlocking components that form the complete NexusOS photonic
computing stack — from photon to program. Together they constitute the first hardware reference
architecture designed to execute WavelengthScript spectral coordinates as native machine instructions,
replacing binary (0/1) logic with wavelength-addressed photonic switching.

The four components are:

1. **SNIC** — Spectral Node Integration Circuit (micro-ring resonator)
2. **PHR-1** — Photonic Harmonic Resonator-1 (bifilar coil controller)
3. **Spectral Relay Mesh v1** — Distributed SNIC node fabric
4. **WavelengthScript Compiler α** — Spectral instruction set generator

---

## 1. SNIC — Spectral Node Integration Circuit

### Classification
Photonic integrated circuit — micro-ring resonator array

### Physical Description
A SNIC is a silicon photonic chip containing an array of micro-ring resonators. Each ring is a
closed-loop optical waveguide, typically 5–50 microns in diameter, evanescently coupled to a
straight bus waveguide. When the optical path length around the ring equals an integer multiple
of the target wavelength, resonance occurs and light at that wavelength is extracted from the bus
into the ring output port. All non-resonant wavelengths pass through undisturbed.

### NexusOS Assignment
Each SNIC ring is tuned to one of the 128 canonical CE bands defined by the NexusOS CE lookup table:

```
CE_TABLE[i] = 380 + (i / 128) × 400   nm     i ∈ {0 … 127}
Band spacing: 3.125 nm
Range: 380.000 nm – 776.875 nm
```

The ring index `i` maps directly to the WDM component of the Ψ channel address:

```
wdm = floor((λ_nm − 380) / 3.125)   clamped to [0, 255]
```

### Function
The SNIC is the physical implementation of the CE lookup table. It performs wavelength-selective
demultiplexing at the speed of light with no CPU, no clock cycle, and no binary logic. An incoming
mixed-wavelength photon stream is decomposed into its constituent CE bands by the ring array,
with each band routed to the corresponding WDM output port.

### Interface to System
- **Input:** Mixed-wavelength photon stream from optical fibre or free-space link
- **Output per ring:** Single-wavelength channel corresponding to one WDM index (0–255)
- **Control input:** Thermal tuning signal from PHR-1

### Prior Art Statement
The SNIC architecture as a direct hardware implementation of the NexusOS CE table
(CE_TABLE[charCode % 128]) was first specified in this document on 2026-05-16.

---

## 2. PHR-1 — Photonic Harmonic Resonator-1

### Classification
Electromagnetic controller — bifilar coil driver with integrated phase controller

### Physical Description
A bifilar coil is wound with two parallel conductors carrying equal-magnitude, opposite-polarity
currents. At distance, the magnetic fields from each conductor cancel, eliminating radiated EMI.
The controlled near-field electric component provides precision electromagnetic coupling to an
adjacent photonic structure. The PHR-1 implements a bifilar coil with an integrated phase-offset
driver, enabling generation of helical (OAM-carrying) near-field modes.

### NexusOS Assignment
The PHR-1 performs three functions corresponding to the three components of a Ψ channel address
`Ψ(wdm, oam, pol)`:

**Function 1 — WDM wavelength stabilisation (→ wdm)**
Micro-ring resonators are thermally sensitive: ΔT = 1°C produces Δλ ≈ 0.1 nm, sufficient to
shift a resonance out of its assigned CE band. The PHR-1 applies a precision DC current to a
microheater integrated adjacent to each SNIC ring, maintaining resonant wavelength within
±0.5 nm of the CE table assignment. This is the hardware-layer implementation of
`verifyHardwareAnchor(blockIndex, readingNm)` in the NexusOS Lambda State Machine.

**Function 2 — OAM mode imprinting (→ oam)**
The two PHR-1 windings, driven with a controlled phase offset θ, generate a helical
electromagnetic field whose topological charge corresponds to an OAM mode index:

```
oam_index = round(θ / (2π / 50))   ∈ {0 … 49}
```

This physically encodes the `oam` component of the Ψ address onto the outgoing photon.
50 OAM modes are supported, matching the NexusOS Hilbert space specification:

```
oam = sum(charCodes) % 50
```

**Function 3 — Polarisation control (→ pol)**
PHR-1 current polarity (positive / negative) sets the output polarisation state:

```
pol = H   (horizontal)   when polarity = +
pol = V   (vertical)     when polarity = −
```

### Complete Ψ Address Written by PHR-1
```
Ψ(wdm, oam, pol) where:
  wdm  ← SNIC ring stabilised by PHR-1 thermal control
  oam  ← helical field phase offset θ
  pol  ← current polarity
```

### Interface to System
- **Input:** Ψ address target from WavelengthScript compiler or Spectral Relay Mesh
- **Output 1:** Thermal stabilisation current to SNIC microheater
- **Output 2:** Phase-offset bifilar drive signal (OAM imprinting)
- **Output 3:** Polarity control signal (polarisation)

### Prior Art Statement
The PHR-1 bifilar coil controller as a physical encoder for the three-component Ψ(wdm,oam,pol)
NexusOS channel address was first specified in this document on 2026-05-16.

---

## 3. Spectral Relay Mesh v1

### Classification
Network architecture — distributed photonic relay fabric

### Description
The Spectral Relay Mesh is a mesh topology of SNIC+PHR-1 node pairs, each assigned a fixed Ψ
channel address, interconnected by optical fibre or free-space optical links. The mesh implements
WNSP routing natively: packets are forwarded based on their embedded Ψ coordinate, not on IP
routing tables.

### Routing Principle
A packet addressed to `Ψ(wdm_d, oam_d, pol_d)` arrives at a relay node:

1. The SNIC array extracts the wavelength band corresponding to `wdm_d`
2. The PHR-1 verifies the OAM mode (`oam_d`) and polarisation (`pol_d`)
3. The mesh controller computes spectral proximity to the destination using the Hilbert space metric
4. The PHR-1 re-encodes the full Ψ address onto the outgoing photon
5. The SNIC launches the photon onto the output port closest to the destination

No IP address, no DNS query, no TCP handshake occurs at any step.

### Deployment Phases

**Phase 1 — 2026 (current): Software overlay on TCP/IP**
The Spectral Relay Mesh runs as a WNSP Bridge overlay (see `/wnsp-bridge` in NexusOS).
Physical inter-node signalling uses TCP/IP for high-bandwidth data and LoRaWAN
(868/915 MHz, Chirp Spread Spectrum) for low-power heartbeat and governance signals.

**Phase 2 — ~2032: All-optical fabric**
TCP/IP transport layer removed. SNIC arrays terminate optical fibre directly.
PHR-1 controllers perform all routing decisions in the photonic domain.
Existing fibre optic infrastructure serves as the physical medium unchanged.

### Channel Capacity
```
Total orthogonal channels: 256 WDM × 50 OAM × 2 POL × 2 DIR = 51,200
Orthogonality guarantee: ⟨Ψᵢ|Ψⱼ⟩ = 0   (quantum mechanical, not policy)
```

### Prior Art Statement
The Spectral Relay Mesh v1 as a WNSP-addressed photonic relay fabric operating across both
TCP/IP overlay (Phase 1) and all-optical (Phase 2) deployment modes was first specified in
this document on 2026-05-16.

---

## 4. WavelengthScript Compiler α

### Classification
Software — spectral instruction set compiler (alpha prototype)

### Description
The WavelengthScript Compiler α translates WavelengthScript source code into an instruction
stream whose opcodes are Ψ channel coordinates rather than binary machine codes. In the alpha
stage the output runs in the NexusOS WNSP Virtual Machine (see `/wnsp-vm`). In the photonic
stage (Phase 2) the same output is executed natively by SNIC+PHR-1 hardware with no
intermediate representation.

### Instruction Set
```
Opcode    Operand                     Hardware mapping (Phase 2)
──────────────────────────────────────────────────────────────────
ARCH      WDM256·OAM50·POL2           Declares Hilbert space dimensions
PUSH      @λnm  "symbol"             PHR-1 sets λ, SNIC routes to symbol port
EMIT      λ=Xnm  Ψ(w,o,p)           PHR-1 writes full Ψ address, SNIC launches photon
LABEL     name  Ψ(w,o,p)            Relay Mesh registers Ψ as function entry point
AGENT     "name"  Ψ(w,o,p)          Relay Mesh assigns persistent Ψ to AI agent node
CALL      Ψ(w,o,p)                  SNIC routes to target node, PHR-1 encodes return address
HALT      —                          PHR-1 de-energises, SNIC closes output port
```

### Compilation Pipeline
```
WavelengthScript source
        ↓
  Lexer / parser
        ↓
  CE encoding:  CE_TABLE[charCode % 128]  →  λ_nm
  Ψ derivation: wdm=floor((λ-380)/3.125), oam=Σ(charCodes)%50, pol=H/V
        ↓
  Instruction emission (opcodes = Ψ coordinates)
        ↓
  WNSP VM bytecode  (Phase 1 — runs in browser/server)
  OR
  Photonic instruction stream  (Phase 2 — executed by SNIC+PHR-1)
```

### Binary Independence
WavelengthScript programs do not compile to binary (0/1). The machine-level representation
is a sequence of Ψ(wdm,oam,pol) triples. On photonic hardware each triple is a physical
instruction to the PHR-1 (which wavelength to set, which OAM mode, which polarisation).
There is no lower level of representation.

### Prior Art Statement
The WavelengthScript Compiler α as a binary-free compiler producing Ψ(wdm,oam,pol) photonic
instruction streams compatible with SNIC+PHR-1 hardware was first specified and implemented
in this document and the NexusOS codebase on 2026-05-16.

---

## Conjunction — Complete Stack Operation

### Forward path (programmer → photon)
```
Developer writes WavelengthScript source
        ↓  WavelengthScript Compiler α
Ψ(wdm, oam, pol) instruction stream
        ↓  Spectral Relay Mesh v1
Packet routed to destination node
        ↓  PHR-1 bifilar coil controller
Thermal stabilisation + OAM imprint + polarisation set
        ↓  SNIC micro-ring resonator
Photon coupled at exact λ, launched on correct channel
        ↓
Signal delivered to destination Ψ address
```

### Return path (photon → program)
```
SNIC detects incoming photon at λ
        ↓  PHR-1 reads OAM mode and polarisation
Full Ψ(wdm, oam, pol) decoded
        ↓  Spectral Relay Mesh resolves Ψ → function symbol
        ↓  WavelengthScript Compiler α symbol table maps Ψ → instruction
WNSP VM or photonic execution unit runs instruction body
        ↓
Result emitted as photon on response channel
```

### Component dependency matrix
```
Component              Depends on          Provides to
──────────────────────────────────────────────────────────────
SNIC                   PHR-1 (tuning)      Relay Mesh (routed channels)
PHR-1                  Compiler α (Ψ target) SNIC (thermal + OAM + pol)
Spectral Relay Mesh    SNIC + PHR-1        Compiler α (addressable network)
WavelengthScript α     Relay Mesh          PHR-1 (Ψ instruction targets)
```

---

## Act 14 Addendum — The Memory: Quantum State Storage Specification (2026-07-19)

This addendum formally extends the SNIC specification to include a quantum memory module,
as disclosed in Act 14 of the WNSP Physics Sequence (`/the-memory`).

### SNIC Memory Module — Coherence Constraints

Each SNIC node that implements quantum state storage must satisfy the **Bloch coherence bound**:

```
T₂ ≤ 2T₁
```

Where:
- `T₁` — longitudinal (population) relaxation time: the average time for an excited state |1⟩ to decay to |0⟩
- `T₂` — transverse (dephasing) time: the average time for a superposition α|0⟩ + β|1⟩ to lose phase coherence

This bound is a consequence of the Lindblad master equation for open quantum systems. It is not an engineering parameter — it is a physical law. No SNIC memory implementation can violate it.

**Reference implementation**: Er³⁺-doped yttrium orthosilicate (Er³⁺:YSO)
- Operating temperature: ≤ 4 K (cryogenic)
- Optical transition: 1536 nm (telecom C-band, compatible with SNIC ring resonators)
- T₁ ≥ 100 ms (optical population lifetime)
- T₂ ≥ 10 ms (achievable with dynamic decoupling)
- CE band mapping: wdm = 228 (≈ 737.5 nm proxy in visible-band CE table; telecom nodes use extended table)

### Atomic Frequency Comb (AFC) Multi-Mode Capacity

Multi-mode storage capacity across 51,200 WNSP channels uses AFC spectral multiplexing:

```
M = Γ_inhom / Δ
```

Where:
- `M` — number of independently storable temporal modes (maps to distinct Ψ channel registers)
- `Γ_inhom` — inhomogeneous linewidth of the storage medium
- `Δ` — AFC tooth spacing (set by spectral pulse shaping)

Each temporal mode maps to a distinct comb tooth, enabling parallel read/write of M channels
without crosstalk. AFC storage is the hardware realisation of the WNSP Ψ register model.

### DLCZ Entanglement Interface

Inter-node entanglement between SNIC memory modules uses the DLCZ protocol:

1. **Write pulse** — write beam drives Raman transition; Stokes photon emitted entangled with stored spin excitation
2. **Heralding** — Stokes photon detected at the network layer; heralds successful entanglement
3. **Read pulse** — retrieve beam converts stored excitation back to anti-Stokes photon on demand
4. **Channel pairing** — entanglement is created between Ψ(+k̂) and Ψ(−k̂) modes of the same WDM band, using bidirectional propagation as the orthogonal Hilbert sub-space

### Storage Efficiency Formula

```
η_storage = (T_storage / T₂) × exp(−T_storage / T₂)
```

Optimal storage time is T_storage = T₂ for maximum η. The efficiency decays exponentially
beyond T₂, approaching zero as T_storage ≫ T₂.

---

## Licence and IP Notice

This specification is released under the GNU Affero General Public License v3.0 (AGPL-3.0).

Any hardware, firmware, HDL, photonic mask layout, driver, or software that implements,
adapts, or interfaces with the SNIC, PHR-1, Spectral Relay Mesh, WavelengthScript
Compiler α, or the SNIC Memory Module (Act 14 Addendum) architectures described in this
document must:

1. Be released in full source form under AGPL-3.0 or a compatible copyleft licence
2. Attribute NexusOS — Te Rata Pou / nexusosdaily-code (https://github.com/nexusosdaily-code/NexusOS) as the originating specification
3. Include this licence notice in all derivative works
4. Not be sublicensed under any proprietary or closed-source licence

The copyleft obligation extends to any network-accessible service that uses these components,
consistent with the AGPL-3.0 network use clause (AGPL §13). Hosting a modified version of
any component described here as a service to third parties — even without binary distribution —
triggers the full source-disclosure obligation.

**Prior art claims covering this specification**: Claims 1–29 in `CHANGELOG.md` (timestamped,
committed to public GitHub repository). Any patent, paper, or proprietary claim covering the
same subject matter after the disclosed dates in that register must contend with this public record.

**First public disclosure (core spec):** 2026-05-16  
**First public disclosure (Act 14 Memory Module addendum):** 2026-07-19  
**Committing repository:** https://github.com/nexusosdaily-code/NexusOS  
**Canonical site:** https://wnsp.io  
**SPDX-License-Identifier:** AGPL-3.0-or-later  
**Licence text:** https://www.gnu.org/licenses/agpl-3.0.en.html
