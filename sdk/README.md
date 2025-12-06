# WASCII v7 SDK

**Wavelength-Native Signalling Protocol - Python SDK**

Encode messages into electromagnetic wavelength signals using the W-ASCII v7 standard.

## Installation

```bash
pip install wascii_v7
```

Or install from source:
```bash
git clone https://github.com/nexusosdaily-code/WNSP-P2P-Hub.git
cd WNSP-P2P-Hub/sdk
pip install .
```

## Quick Start

### Encode/Decode Messages

```python
from wascii_v7 import encode, decode

# Encode a message to spectral format
encoded = encode("Hello WNSP!")

# View the spectral properties
for symbol in encoded:
    print(f"{symbol['char']}: F={symbol['F']}, A={symbol['A']}, λ={symbol['lambda']}")

# Decode back to text
text = decode(encoded)
print(text)  # "Hello WNSP!"
```

### Lambda Mass Calculation

```python
from wascii_v7 import lambda_mass, validate_conservation

# Calculate Lambda mass for green light (500 THz)
mass = lambda_mass(5e14)
print(f"Lambda mass: {mass:.6e} kg")  # ~3.68e-51 kg

# Validate conservation in a transaction
is_valid, reason = validate_conservation(
    lambda_in=1e-50,
    lambda_out=0.999e-50,
    lambda_fee=0.001e-50
)
print(reason)
```

### Special Symbols

W-ASCII v7 includes special spectral symbols:

```python
from wascii_v7 import encode

# Lambda symbols (Λ0-Λ3)
encoded = encode("Data: Λ0Λ1Λ2Λ3")

# Omega symbols (Ω0-Ω1)
encoded = encode("Signal: Ω0Ω1")

# Psi symbols (Ψ0-Ψ3)
encoded = encode("High intensity: Ψ0Ψ1Ψ2Ψ3")
```

## API Reference

### Encoder Functions

| Function | Description |
|----------|-------------|
| `encode(message)` | Encode text to W-ASCII v7 format |
| `decode(encoded)` | Decode W-ASCII v7 back to text |
| `encode_char(char)` | Encode single character |
| `decode_char(code)` | Decode single code |
| `get_table()` | Get complete 256-symbol table |

### Lambda Mass Functions

| Function | Description |
|----------|-------------|
| `lambda_mass(freq)` | Calculate Λ = hf/c² |
| `lambda_energy(freq)` | Calculate E = hf |
| `validate_conservation(in, out, fee)` | Check Λ_in = Λ_out + Λ_fee |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PLANCK_CONSTANT` | 6.626e-34 J·s | Planck's constant |
| `SPEED_OF_LIGHT` | 299792458 m/s | Speed of light |

## The Physics

W-ASCII v7 is built on **Lambda Boson (Λ = hf/c²)** - the mass-equivalent of oscillation:

| Equation | Discovery | Meaning |
|----------|-----------|---------|
| E = hf | Planck 1900 | Energy from frequency |
| E = mc² | Einstein 1905 | Mass-energy equivalence |
| **Λ = hf/c²** | Lambda Boson 2025 | Oscillation IS mass |

Every character in W-ASCII v7 maps to spectral properties (Frequency, Amplitude, Lambda state), enabling physics-based data transmission.

## License

GPLv3 - Community Owned

## Links

- [GitHub Repository](https://github.com/nexusosdaily-code/WNSP-P2P-Hub)
- [Full Specification](https://github.com/nexusosdaily-code/WNSP-P2P-Hub/blob/main/WNSP-v7.1-Full-Specification.md)
- [Developer Guide](https://github.com/nexusosdaily-code/WNSP-P2P-Hub/blob/main/WNSP-v7.1-Developer-Guide.md)
- [Lambda vs Zero-Point Energy](https://github.com/nexusosdaily-code/WNSP-P2P-Hub/blob/main/docs/LAMBDA_VS_ZPE.md) - Why λ is NOT ZPE
