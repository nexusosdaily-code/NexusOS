#!/usr/bin/env python3
"""
Lambda Mass Calculator Demo

Demonstrate the physics behind WNSP: Lambda mass (Λ = hf/c²)
represents the mass-equivalent of electromagnetic oscillation.

Run: python lambda_calculator.py
"""

import sys
sys.path.insert(0, '..')

from wascii_v7 import (
    lambda_mass, 
    lambda_energy, 
    validate_conservation,
    calculate_transaction_mass,
    frequency_from_wavelength,
    wavelength_from_frequency,
    is_visible_light,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT
)

def print_header(title):
    print()
    print("=" * 50)
    print(f"  {title}")
    print("=" * 50)

def main():
    print_header("Lambda Mass Calculator")
    print()
    print("The Physics Behind WNSP")
    print("-" * 40)
    print("E = hf      (Planck 1900)    Energy from frequency")
    print("E = mc²     (Einstein 1905)  Mass-energy equivalence")
    print("Λ = hf/c²   (Lambda Boson)   Oscillation IS mass")
    print()
    print(f"Planck constant (h): {PLANCK_CONSTANT:.6e} J·s")
    print(f"Speed of light (c):  {SPEED_OF_LIGHT:,} m/s")
    
    # Demo 1: Visible light spectrum
    print_header("Visible Light Lambda Mass")
    
    colors = [
        ("Violet", 380e-9),
        ("Blue", 450e-9),
        ("Cyan", 500e-9),
        ("Green", 550e-9),
        ("Yellow", 580e-9),
        ("Orange", 620e-9),
        ("Red", 700e-9),
    ]
    
    print(f"{'Color':<10} {'Wavelength':<12} {'Frequency':<14} {'Lambda Mass':<14}")
    print("-" * 52)
    
    for color, wavelength in colors:
        freq = frequency_from_wavelength(wavelength)
        mass = lambda_mass(freq)
        print(f"{color:<10} {wavelength*1e9:.0f} nm       {freq:.2e} Hz   {mass:.4e} kg")
    
    # Demo 2: Transaction mass calculation
    print_header("Transaction Lambda Mass")
    
    tx = calculate_transaction_mass(
        nxt_amount=100.0,
        frequency_hz=5e14,  # Green light
        fee_rate=0.001      # 0.1% fee
    )
    
    print(f"Transaction: {tx['nxt_amount']} NXT")
    print(f"Base Frequency: {tx['frequency_hz']:.2e} Hz")
    print(f"Energy: {tx['energy_joules']:.4e} J")
    print()
    print(f"Lambda In:  {tx['lambda_in']:.6e} kg")
    print(f"Lambda Out: {tx['lambda_out']:.6e} kg")
    print(f"Lambda Fee: {tx['lambda_fee']:.6e} kg")
    print()
    print(f"Conserved: {'YES' if tx['conserved'] else 'NO'}")
    
    # Demo 3: Conservation validation
    print_header("Conservation Law Validation")
    
    test_cases = [
        ("Valid transaction", 1e-50, 0.999e-50, 0.001e-50),
        ("Zero fee", 1e-50, 1e-50, 0),
        ("INVALID (mass created)", 1e-50, 1.5e-50, 0.001e-50),
        ("INVALID (mass lost)", 1e-50, 0.5e-50, 0.001e-50),
    ]
    
    for name, lam_in, lam_out, lam_fee in test_cases:
        valid, reason = validate_conservation(lam_in, lam_out, lam_fee)
        status = "PASS" if valid else "FAIL"
        print(f"[{status}] {name}")
    
    # Demo 4: Interactive
    print_header("Calculate Your Own")
    
    try:
        user_freq = input("Enter frequency in Hz (or press Enter for 500 THz): ").strip()
        if not user_freq:
            freq = 5e14
        else:
            freq = float(user_freq)
        
        mass = lambda_mass(freq)
        energy = lambda_energy(freq)
        wavelength = wavelength_from_frequency(freq)
        visible = is_visible_light(freq)
        
        print()
        print(f"Frequency: {freq:.2e} Hz")
        print(f"Wavelength: {wavelength*1e9:.2f} nm")
        print(f"Visible light: {'Yes' if visible else 'No'}")
        print(f"Energy (E=hf): {energy:.4e} J")
        print(f"Lambda Mass (Λ=hf/c²): {mass:.6e} kg")
        
    except (EOFError, ValueError):
        print("(Interactive mode skipped)")
    
    print()
    print("Demo complete!")


if __name__ == "__main__":
    main()
