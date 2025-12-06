# Wavelength Mechanics - Quick Reference Guide

**For Developers & Researchers**

---

## 📚 Table of Contents

**Developer's Cheat Sheet - Fast Lookup**

### ⚡ Quick Reference
1. [**Core Equations**](#core-equations) - Planck-Einstein, wave equation, interference
2. [**5 Wave Dimensions**](#5-wave-dimensions) - λ, A, φ, P, t table
3. [**WNSP Encoding Map**](#wnsp-encoding-map) - Character-to-wavelength mapping

### 🔐 Security Properties
4. [**Collision Resistance**](#collision-resistance) - P(collision) < 2⁻²⁵⁶
5. [**Quantum Resistance**](#quantum-resistance) - Why quantum computers can't break this
6. [**Sensitivity**](#sensitivity) - How small changes affect patterns

### 💻 Implementation
7. [**Quick Start Code**](#implementation-quick-start) - Copy-paste examples
   - Create wave signature, compute interference, WNSP encoding, validation
8. [**Performance Benchmarks**](#performance-benchmarks) - Operation timings
9. [**Spectral Region Economics**](#spectral-region-economics) - Cost by wavelength

### 🛠️ Developer Tips
10. [**Debugging Tips**](#debugging-tips) - Visualization & verification
11. [**Common Pitfalls**](#common-pitfalls) - What to avoid
12. [**File Locations**](#file-locations) - Where to find the code

**Perfect for**: Quick lookups, code snippets, formula reference

---

## Core Equations

### Planck-Einstein Relation
```
E = hf = hc/λ

h = 6.626×10⁻³⁴ J·s (Planck's constant)
c = 3×10⁸ m/s (speed of light)
λ = wavelength (meters)
f = frequency (Hz)
```

### Wave Equation
```
E(x,t) = A·exp[i(kx - ωt + φ)]

k = 2π/λ (wave number)
ω = 2πf (angular frequency)
A = amplitude
φ = phase
```

### Interference Intensity
```
I(x) = I₁ + I₂ + 2√(I₁I₂)·cos(Δkx + Δφ)

Δk = k₁ - k₂
Δφ = φ₁ - φ₂
```

---

## 5 Wave Dimensions

| Dimension | Symbol | Range | Derived From | Security Impact |
|-----------|--------|-------|--------------|-----------------|
| **Wavelength** | λ | 380-750 nm | Character encoding | Primary identifier |
| **Amplitude** | A | 0.3-1.0 | Message hash | Interference contrast |
| **Phase** | φ | 0-2π rad | "message+phase" hash | Fringe position |
| **Polarization** | P | 0-π rad | "message+pol" hash | Interference strength |
| **Time** | t | Frame duration | Timestamp | Replay protection |

---

## WNSP Encoding Map

### Character Groups
```
A-Z:     380-530 nm  (Violet → Green)
0-9:     536-590 nm  (Green → Yellow)
Symbols: 596-758 nm  (Yellow → Red)

Spacing: 6 nm between characters
```

### Example Encoding
```
'H' → 422 nm (blue)
'E' → 404 nm (violet)
'L' → 446 nm (blue)
'L' → 446 nm (blue)
'O' → 464 nm (blue)
```

---

## Security Properties

### Collision Resistance
```
P(collision) < 2⁻²⁵⁶

State space per wave: 3,700 wavelengths × ∞ amplitude × ∞ phase × ∞ polarization
Pattern hash: SHA-256 of 256-point interference pattern
```

### Quantum Resistance
```
No algebraic structure → Shor's algorithm doesn't apply
Grover attack: O(2¹²⁸) operations still required
Post-quantum security: 128-bit ✅
```

### Sensitivity
```
Δλ = 1 nm → Pattern change detectable
Δφ = 0.01 rad → Measurable fringe shift
ΔA = 0.01 → Intensity variation observable
```

---

## Implementation Quick Start

### Create Wave Signature
```python
from wavelength_validator import WavelengthValidator, SpectralRegion, ModulationType

validator = WavelengthValidator(grid_resolution=256)

wave = validator.create_message_wave(
    message_data="HELLO",
    spectral_region=SpectralRegion.BLUE,
    modulation_type=ModulationType.PSK
)

print(f"Wavelength: {wave.wavelength*1e9:.1f} nm")
print(f"Energy: {wave.quantum_energy*6.242e18:.2f} eV")
print(f"Cost: {wave.energy_in_nxt:.6f} NXT")
```

### Compute Interference
```python
# Create two waves
wave1 = validator.create_message_wave("MESSAGE1", SpectralRegion.RED, ModulationType.PSK)
wave2 = validator.create_message_wave("MESSAGE2", SpectralRegion.BLUE, ModulationType.PSK)

# Compute interference pattern
pattern = validator.compute_interference(wave1, wave2)

print(f"Pattern Hash: {pattern.pattern_hash}")
print(f"Coherence: {pattern.coherence_factor:.4f}")
print(f"Max Intensity: {pattern.max_intensity:.2f}")
print(f"Min Intensity: {pattern.min_intensity:.2f}")
```

### WNSP Message Encoding
```python
from wnsp_protocol_v2 import WnspEncoderV2

encoder = WnspEncoderV2()

message = encoder.encode_message(
    content="HELLO WORLD 2025!",
    sender_id="alice",
    recipient_id="bob",
    spectral_region=SpectralRegion.GREEN,
    modulation_type=ModulationType.PSK,
    parent_message_ids=["msg_parent_1"]
)

print(f"Message ID: {message.message_id}")
print(f"Cost: {message.cost_nxt:.6f} NXT")
print(f"Interference Hash: {message.interference_hash[:16]}...")
print(f"Frame Count: {len(message.frames)}")
```

### Validate Message Chain
```python
# Validate DAG link via interference
success, pattern, msg = validator.validate_message_chain(
    message1_wave=parent_wave,
    message2_wave=child_wave,
    expected_interference_hash=child_message.interference_hash
)

if success:
    print(f"✅ Valid chain link: {msg}")
else:
    print(f"❌ Invalid chain: {msg}")
```

---

## Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Create wave signature | <1 ms | Hash-based derivation |
| Compute interference (256 pts) | ~16 ms | NumPy optimized |
| Validate message chain | ~20 ms | Includes recreation + interference |
| WNSP encode 100 chars | ~5 ms | Character mapping + frames |

---

## Spectral Region Economics

| Region | Wavelength | Energy | Relative Cost | Use Case |
|--------|------------|--------|---------------|----------|
| UV | 100-400 nm | 3.1-12.4 eV | Very High | Secure government |
| Violet | 380-450 nm | 2.76-3.26 eV | High | Financial |
| Blue | 450-495 nm | 2.50-2.76 eV | Medium-High | Business |
| Green | 495-570 nm | 2.18-2.50 eV | Medium | Standard messaging |
| Yellow | 570-590 nm | 2.10-2.18 eV | Medium-Low | Social |
| Orange | 590-620 nm | 2.00-2.10 eV | Low | Broadcasts |
| Red | 620-750 nm | 1.65-2.00 eV | Very Low | Public announcements |
| IR | 750-1000 nm | 1.24-1.65 eV | Minimal | Bulk data |

**Economic Formula**: `cost_nxt = (quantum_energy × message_bytes × SCALE) / 1e6`

---

## Debugging Tips

### Check Wave Properties
```python
wave_dict = wave.to_dict()
print(json.dumps(wave_dict, indent=2))
```

### Visualize Interference Pattern
```python
import matplotlib.pyplot as plt

pattern = validator.compute_interference(wave1, wave2)
plt.plot(pattern.intensity_distribution)
plt.title(f"Interference Pattern (Hash: {pattern.pattern_hash[:8]})")
plt.xlabel("Spatial Position")
plt.ylabel("Intensity")
plt.show()
```

### Verify Conservation
```python
# Total energy should equal sum of individual energies
E_total = np.sum(pattern.intensity_distribution)
E1 = np.sum(np.abs(E1)**2)
E2 = np.sum(np.abs(E2)**2)

assert abs(E_total - (E1 + E2)) < 1e-10, "Energy not conserved!"
```

---

## Common Pitfalls

### ❌ Don't: Modify wavelength after encoding
```python
# Wrong - breaks interference validation
message.frames[0].wavelength_nm = 500
```

### ✅ Do: Recreate message with new content
```python
# Correct - generates new wave signature
new_message = encoder.encode_message(new_content, ...)
```

### ❌ Don't: Use low grid resolution
```python
# Wrong - insufficient security
validator = WavelengthValidator(grid_resolution=32)  # Only ~48-bit security
```

### ✅ Do: Use recommended 256 points
```python
# Correct - 128-bit post-quantum security
validator = WavelengthValidator(grid_resolution=256)
```

---

## File Locations

```
wavelength_validator.py         - Core wave interference engine
wnsp_protocol_v2.py              - WNSP v2.0 protocol
dag_domains/wavelength_crypto.py - Encryption layer
wnsp_frames.py                   - Frame data structures

docs/WAVELENGTH_VALIDATION_SCIENCE.md - Complete scientific docs
docs/QUICK_REFERENCE_WAVELENGTH_MECHANICS.md - This file
WAVELENGTH_CRYPTO_THEORY.md      - Encryption theory
```

---

## Further Reading

1. **Full Scientific Documentation**: `docs/WAVELENGTH_VALIDATION_SCIENCE.md`
   - Maxwell's equations derivations
   - Mathematical proofs
   - Quantum resistance analysis

2. **Encryption Theory**: `WAVELENGTH_CRYPTO_THEORY.md`
   - FSE, AME, PME, QIML methods
   - Security properties

3. **WNSP Dashboard**: `wnsp_dashboard_v2.py`
   - Interactive visualization
   - Real-time encoding/validation

---

**Quick Reference Version**: 1.0  
**Last Updated**: November 21, 2025
