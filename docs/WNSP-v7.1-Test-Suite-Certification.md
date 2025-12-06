# WNSP v7.1 Test Suite & Certification

**Substrate-Powered Implementation Verification**

> "If it passes the substrate, it's physics-compliant."

---

## Overview

The WNSP Certification Engine validates implementations against the Lambda Boson substrate. Pass all tests to receive a cryptographic certificate proving your implementation is compliant with NexusOS physics.

---

## Test Categories

### 1. W-ASCII Encoding Compliance
- **WASC-001**: W-ASCII Table Coverage (96 printable characters)
- **WASC-002**: Extended Symbols (Λ, Ω, Φ, Ψ verified)
- **WASC-003**: Frequency-Amplitude Mapping (A: 0-3, λ: 0-3)

### 2. Lambda Mass Conservation
- **LAMB-001**: Lambda Mass Formula (Λ = hf/c²)
- **LAMB-002**: Conservation Law (Λ_in = Λ_out + Λ_fee)
- **LAMB-003**: Multi-Frequency Validation (380-780nm spectrum)

### 3. Frame Structure Validation
- **FRAM-001**: Frame Structure [Preamble][Header][Payload][Footer]
- **FRAM-002**: λ-Signature in Header

### 4. Spectral Routing Compliance
- **ROUT-001**: Spectral Presence Detection (no IP/DNS)
- **ROUT-002**: λ-Beacon Pulse Format

### 5. Constitutional Adherence
- **CONS-001**: C-0001 Non-Dominance (≤5% authority)
- **CONS-002**: C-0003 Energy-Backed Validity

### 6. BHLS Floor Protection
- **BHLS-001**: BHLS Floor Amount (1,150 NXT/month)
- **BHLS-002**: BHLS Categories (7 categories)
- **BHLS-003**: BHLS Category Sum Validation

---

## Certification Process

### Step 1: Import the Certification Engine

```python
from wnsp_v7.certification_engine import certify_implementation

# Run certification
cert = certify_implementation("MyWNSPNode", "1.0.0")

# Check result
if cert.valid:
    print(f"CERTIFIED! ID: {cert.certificate_id}")
    print(f"Attestation TX: {cert.attestation_tx_id}")
    print(f"Signature: {cert.signature[:32]}...")
else:
    print(f"FAILED: {cert.tests_passed}/{cert.tests_total} tests passed")
```

**Note:** Full certification requires providing custom encoder/calculator functions to prove YOUR implementation is compliant.

### Step 2: Run with Custom Functions

```python
from wnsp_v7.certification_engine import get_certification_engine

engine = get_certification_engine()

# Test your custom encoder
def my_wascii_encoder(char):
    # Your implementation
    return {"hex": ord(char), "A": 3, "lambda": 0}

# Test your Lambda calculator
def my_lambda_calculator(frequency_hz):
    h = 6.62607015e-34
    c = 299792458
    return (h * frequency_hz) / (c ** 2)

# Run with custom functions
cert = engine.run_full_test_suite(
    "MyCustomNode",
    "2.0.0",
    wascii_encoder=my_wascii_encoder,
    lambda_calculator=my_lambda_calculator
)
```

### Step 3: Get Detailed Report

```python
report = engine.get_test_report()

print(f"Audit ID: {report['audit_id']}")
print(f"Passed: {report['passed']}/{report['total_tests']}")

for category, results in report['by_category'].items():
    print(f"  {category}: {results['status']}")
```

---

## Certificate Structure

```json
{
  "certificate_id": "a1b2c3d4e5f6...",
  "implementation": "MyWNSPNode",
  "version": "1.0.0",
  "issuer": "NexusOS Substrate v7.1",
  "issued_at": 1733100000.0,
  "expires_at": 1764636000.0,
  "tests_passed": 15,
  "tests_total": 15,
  "pass_rate": "100.0%",
  "categories_passed": [
    "wascii_encoding",
    "lambda_mass_conservation",
    "frame_structure",
    "spectral_routing",
    "constitutional_compliance",
    "bhls_floor_protection"
  ],
  "lambda_mass_certified": 3.68e-51,
  "signature": "a1b2c3d4...",
  "valid": true
}
```

---

## Verification

### Verify a Certificate

```python
from wnsp_v7.certification_engine import get_certification_engine

engine = get_certification_engine()

# Verify certificate
valid, message = engine.verify_certificate("a1b2c3d4e5f6...")
print(message)
```

### Certificate Validity

A certificate is valid if:
1. Signature is present
2. Not expired (1 year validity)
3. All tests passed (tests_passed == tests_total)

---

## Test Result Types

| Result | Meaning |
|--------|---------|
| **PASS** | Test passed all validation checks |
| **FAIL** | Test failed, implementation not compliant |
| **WARN** | Test passed with warnings |
| **SKIP** | Test was skipped |

---

## Physics Constants Used

| Constant | Value | Description |
|----------|-------|-------------|
| **h** | 6.62607015 × 10⁻³⁴ J·s | Planck constant |
| **c** | 299,792,458 m/s | Speed of light |
| **Visible λ** | 380-780 nm | Visible light spectrum |

---

## Integration with Substrate

The Certification Engine uses the live substrate to validate:

```python
# Certification tests run through actual substrate validation
valid, reason = substrate.validate_transaction(tx)

# Constitutional checks use real substrate rules
substrate._check_constitutional(tx)

# BHLS values come from substrate configuration
substrate.BHLS_MONTHLY  # 1150.0
substrate.BHLS_CATEGORIES  # 7 categories
```

---

## Example: Full Certification Flow

```python
from wnsp_v7.certification_engine import (
    WNSPCertificationEngine,
    get_substrate_coordinator
)

# Initialize
substrate = get_substrate_coordinator()
engine = WNSPCertificationEngine(substrate)

# Start audit
audit_id = engine.start_audit("ProductionNode", "3.0.0")
print(f"Audit started: {audit_id}")

# Run full test suite
cert = engine.run_full_test_suite("ProductionNode", "3.0.0")

# Get detailed report
report = engine.get_test_report()

# Save certificate
if cert.valid:
    import json
    with open(f"cert_{cert.certificate_id}.json", "w") as f:
        json.dump(cert.to_dict(), f, indent=2)
    print(f"Certificate saved: cert_{cert.certificate_id}.json")
```

---

## Why Substrate-Based Certification?

1. **Physics-Grounded**: Tests validate against actual Lambda mass calculations
2. **Constitutional**: Ensures compliance with NexusOS governance rules
3. **BHLS Protected**: Verifies basic human living standards are enforced
4. **Cryptographic Proof**: Signed certificates prove compliance
5. **Permanent Record**: Certificates stored on substrate

---

## License

GPLv3 — Community-Owned, NexusOS Multisig Maintained
