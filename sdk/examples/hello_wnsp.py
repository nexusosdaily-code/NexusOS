#!/usr/bin/env python3
"""
Hello WNSP - Your First Wavelength Message

The simplest possible WNSP demo. Just 5 lines to send your first
wavelength-encoded message!

Run: python hello_wnsp.py
"""

import sys
sys.path.insert(0, '..')

from wascii_v7 import encode, decode, lambda_mass

# 1. Create your message
message = "Hello, Wavelength World!"

# 2. Encode to spectral format
encoded = encode(message)

# 3. Each character now has physics properties
print(f"Message: {message}")
print(f"Encoded to {len(encoded)} spectral symbols")
print()

# 4. Show the spectral properties
for sym in encoded[:8]:  # First 8 characters
    freq = sym['F'] * 1e12  # Scale to THz for demo
    mass = lambda_mass(freq)
    print(f"  '{sym['char']}' → F={sym['F']}, A={sym['A']}, λ={sym['lambda']} → Mass: {mass:.2e} kg")

print("  ...")

# 5. Decode back
decoded = decode(encoded)
print()
print(f"Decoded: {decoded}")
print()
print("Congratulations! You just sent your first wavelength message!")
