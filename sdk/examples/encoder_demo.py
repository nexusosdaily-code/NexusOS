#!/usr/bin/env python3
"""
W-ASCII v7 Encoder/Decoder Demo

A simple demo showing how to encode messages into spectral format
and decode them back.

Run: python encoder_demo.py
"""

import sys
sys.path.insert(0, '..')

from wascii_v7 import encode, decode, encode_char, get_table

def main():
    print("=" * 50)
    print("  W-ASCII v7 Encoder/Decoder Demo")
    print("  Wavelength-Native Signalling Protocol")
    print("=" * 50)
    print()
    
    # Demo 1: Basic encoding
    print("[1] Basic Message Encoding")
    print("-" * 30)
    message = "Hello World!"
    encoded = encode(message)
    
    print(f"Message: {message}")
    print(f"Symbols: {len(encoded)}")
    print()
    print("Spectral Breakdown:")
    print(f"{'Char':<6} {'Hex':<8} {'F':<6} {'A':<4} {'λ':<4}")
    print("-" * 30)
    
    for sym in encoded:
        print(f"{sym['char']:<6} 0x{sym['code']:02x}     {sym['F']:<6} {sym['A']:<4} {sym['lambda']:<4}")
    
    print()
    decoded = decode(encoded)
    print(f"Decoded: {decoded}")
    print(f"Match: {'YES' if decoded == message else 'NO'}")
    print()
    
    # Demo 2: Special symbols
    print("[2] Special Spectral Symbols")
    print("-" * 30)
    
    special_chars = ["Λ0", "Λ1", "Λ2", "Λ3", "Ω0", "Ω1", "Φ0", "Φ1", "Ψ0", "Ψ1", "Ψ2", "Ψ3"]
    
    for char in special_chars:
        result = encode_char(char)
        if result:
            print(f"{char}: code=0x{result['code']:02x}, F={result['F']}, A={result['A']}, λ={result['lambda']}")
    
    print()
    
    # Demo 3: Interactive mode
    print("[3] Try Your Own Message")
    print("-" * 30)
    
    try:
        user_input = input("Enter a message (or press Enter for demo): ").strip()
        if not user_input:
            user_input = "WNSP v7 rocks!"
        
        encoded = encode(user_input)
        print(f"\nEncoded '{user_input}' to {len(encoded)} spectral symbols:")
        
        total_f = sum(s['F'] for s in encoded)
        total_a = sum(s['A'] for s in encoded)
        
        print(f"  Total Frequency Index: {total_f}")
        print(f"  Total Amplitude: {total_a}")
        print(f"  Average λ-state: {sum(s['lambda'] for s in encoded) / len(encoded):.2f}")
        
        decoded = decode(encoded)
        print(f"\nDecoded: {decoded}")
        
    except EOFError:
        print("(Interactive mode skipped)")
    
    print()
    print("Demo complete!")


if __name__ == "__main__":
    main()
