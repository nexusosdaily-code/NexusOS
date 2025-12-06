# WNSP v7.1 Quick Start

**Send your first wavelength message in 5 minutes!**

## What You'll Learn

1. Encode text into electromagnetic wavelength signals
2. Understand Lambda mass (the physics behind WNSP)
3. Decode messages back to text

## Prerequisites

- Python 3.8+
- No external dependencies required

## Installation

```bash
# Clone the repository
git clone https://github.com/nexusosdaily-code/WNSP-P2P-Hub.git
cd WNSP-P2P-Hub/sdk

# That's it! No pip install needed for basic usage
```

## Step 1: Hello WNSP (30 seconds)

Create `hello.py`:

```python
from wascii_v7 import encode, decode

# Encode your message
message = "Hello WNSP!"
encoded = encode(message)

print(f"Original: {message}")
print(f"Encoded to {len(encoded)} spectral symbols")

# Decode back
decoded = decode(encoded)
print(f"Decoded: {decoded}")
```

Run it:
```bash
python hello.py
```

Output:
```
Original: Hello WNSP!
Encoded to 11 spectral symbols
Decoded: Hello WNSP!
```

**Congratulations!** You just sent your first wavelength message.

## Step 2: Understanding Spectral Properties (1 minute)

Each character maps to electromagnetic properties:

```python
from wascii_v7 import encode

encoded = encode("Hi")

for symbol in encoded:
    print(f"Character: {symbol['char']}")
    print(f"  Frequency (F): {symbol['F']}")
    print(f"  Amplitude (A): {symbol['A']}")
    print(f"  Lambda (λ):    {symbol['lambda']}")
```

Output:
```
Character: H
  Frequency (F): 72
  Amplitude (A): 3
  Lambda (λ):    0
Character: i
  Frequency (F): 105
  Amplitude (A): 3
  Lambda (λ):    1
```

## Step 3: Lambda Mass - The Physics (2 minutes)

Every message carries mass through its wavelength:

```python
from wascii_v7 import lambda_mass, PLANCK_CONSTANT, SPEED_OF_LIGHT

# The physics: Λ = hf/c²
# - E = hf (Planck) - Energy from frequency
# - E = mc² (Einstein) - Mass-energy equivalence
# - Λ = hf/c² - Oscillation IS mass

# Calculate Lambda mass for green light (500 THz)
frequency = 5e14  # Hz
mass = lambda_mass(frequency)

print(f"Frequency: {frequency:.2e} Hz")
print(f"Lambda mass: {mass:.6e} kg")
```

Output:
```
Frequency: 5.00e+14 Hz
Lambda mass: 3.686249e-36 kg
```

## Step 4: Special Symbols (1 minute)

W-ASCII v7 includes physics symbols:

```python
from wascii_v7 import encode

# Lambda symbols (Λ0-Λ3) - Core informational modes
# Omega symbols (Ω0-Ω1) - Spectral signals
# Psi symbols (Ψ0-Ψ3) - High-intensity spectral

message = "Data: Λ0Λ1 Signal: Ψ0"
encoded = encode(message)

for sym in encoded:
    if sym['char'].startswith(('Λ', 'Ω', 'Ψ')):
        print(f"{sym['char']}: code=0x{sym['code']:02x}")
```

## Step 5: Validate Conservation (30 seconds)

Lambda mass must be conserved in transactions:

```python
from wascii_v7 import validate_conservation

# Transaction: 100 units with 0.1% fee
lambda_in = 1e-50
lambda_out = 0.999e-50
lambda_fee = 0.001e-50

valid, reason = validate_conservation(lambda_in, lambda_out, lambda_fee)

print(f"Conservation valid: {valid}")
# Output: Conservation valid: True
```

## What's Next?

- **[Full Specification](https://github.com/nexusosdaily-code/WNSP-P2P-Hub/blob/main/WNSP-v7.1-Full-Specification.md)** - Complete technical details
- **[Developer Guide](https://github.com/nexusosdaily-code/WNSP-P2P-Hub/blob/main/WNSP-v7.1-Developer-Guide.md)** - Integration patterns
- **[SDK Examples](./examples/)** - More sample code
- **[Certification](https://github.com/nexusosdaily-code/WNSP-P2P-Hub/blob/main/WNSP-v7.1-Test-Suite-Certification.md)** - Certify your implementation

## The Physics in 30 Seconds

```
E = hf      (Planck 1900)    Energy comes from frequency
E = mc²    (Einstein 1905)   Mass and energy are equivalent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Λ = hf/c²  (Lambda Boson)    Therefore: Oscillation IS mass
```

Every WNSP message carries inherent mass through its wavelength.
This is not metaphor—it's direct application of Nobel Prize-winning physics.

---

**License**: GPLv3 | **Community Owned**
