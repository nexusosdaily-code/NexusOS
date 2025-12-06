"""
Lambda Mass Calculator

Calculate Lambda mass (Λ = hf/c²) - the mass-equivalent of electromagnetic oscillation.

This is the core physics behind WNSP: every message carries inherent mass through
its wavelength, derived from Nobel Prize-winning physics:
    - E = hf (Planck 1900) - Energy from frequency
    - E = mc² (Einstein 1905) - Mass-energy equivalence  
    - Λ = hf/c² (Lambda Boson 2024) - Oscillation IS mass

Example:
    from wascii_v7 import lambda_mass, validate_conservation
    
    # Calculate mass for green light (500 THz)
    mass = lambda_mass(5e14)
    print(f"Lambda mass: {mass:.6e} kg")
    
    # Validate conservation in a transaction
    is_valid = validate_conservation(
        lambda_in=1e-50,
        lambda_out=0.999e-50,
        lambda_fee=0.001e-50
    )
"""

from typing import Tuple, Dict, Any

# Physical Constants (SI 2019 exact values)
PLANCK_CONSTANT = 6.62607015e-34  # h in Joule-seconds
SPEED_OF_LIGHT = 299792458  # c in meters/second

# Visible light bounds
VISIBLE_LIGHT_MIN = 380e-9  # 380nm (violet)
VISIBLE_LIGHT_MAX = 780e-9  # 780nm (red)


def lambda_mass(frequency_hz: float) -> float:
    """
    Calculate Lambda mass from frequency using Λ = hf/c².
    
    The Lambda mass represents the mass-equivalent of electromagnetic
    oscillation - the fundamental unit of value in WNSP.
    
    Args:
        frequency_hz: Frequency in Hertz (Hz)
    
    Returns:
        Lambda mass in kilograms (kg)
    
    Example:
        # Green light at 500 THz
        mass = lambda_mass(5e14)
        print(f"{mass:.6e} kg")  # ~3.68e-51 kg
        
        # Red light at 400 THz
        mass = lambda_mass(4e14)
        print(f"{mass:.6e} kg")  # ~2.94e-51 kg
    """
    return (PLANCK_CONSTANT * frequency_hz) / (SPEED_OF_LIGHT ** 2)


def lambda_energy(frequency_hz: float) -> float:
    """
    Calculate photon energy from frequency using E = hf.
    
    Args:
        frequency_hz: Frequency in Hertz (Hz)
    
    Returns:
        Energy in Joules (J)
    
    Example:
        energy = lambda_energy(5e14)  # ~3.31e-19 J
    """
    return PLANCK_CONSTANT * frequency_hz


def frequency_from_wavelength(wavelength_m: float) -> float:
    """
    Convert wavelength to frequency using f = c/λ.
    
    Args:
        wavelength_m: Wavelength in meters
    
    Returns:
        Frequency in Hertz (Hz)
    
    Example:
        # Green light at 550nm
        freq = frequency_from_wavelength(550e-9)  # ~5.45e14 Hz
    """
    return SPEED_OF_LIGHT / wavelength_m


def wavelength_from_frequency(frequency_hz: float) -> float:
    """
    Convert frequency to wavelength using λ = c/f.
    
    Args:
        frequency_hz: Frequency in Hertz (Hz)
    
    Returns:
        Wavelength in meters (m)
    
    Example:
        # 500 THz
        wavelength = wavelength_from_frequency(5e14)  # 600nm
    """
    return SPEED_OF_LIGHT / frequency_hz


def is_visible_light(frequency_hz: float) -> bool:
    """
    Check if frequency falls within visible light spectrum.
    
    Args:
        frequency_hz: Frequency in Hertz
    
    Returns:
        True if frequency corresponds to visible light (380-780nm)
    """
    wavelength = wavelength_from_frequency(frequency_hz)
    return VISIBLE_LIGHT_MIN <= wavelength <= VISIBLE_LIGHT_MAX


def validate_conservation(
    lambda_in: float,
    lambda_out: float,
    lambda_fee: float,
    tolerance: float = 1e-60
) -> Tuple[bool, str]:
    """
    Validate Lambda mass conservation: Λ_in = Λ_out + Λ_fee.
    
    This is the fundamental law of WNSP - mass cannot be created or destroyed
    in transactions, only transferred.
    
    Args:
        lambda_in: Input Lambda mass (kg)
        lambda_out: Output Lambda mass (kg)
        lambda_fee: Fee Lambda mass (kg)
        tolerance: Acceptable numerical error (default 1e-60 kg)
    
    Returns:
        Tuple of (is_valid, reason)
    
    Example:
        is_valid, reason = validate_conservation(
            lambda_in=1e-50,
            lambda_out=0.999e-50,
            lambda_fee=0.001e-50
        )
        if is_valid:
            print("Conservation law satisfied!")
    """
    expected = lambda_out + lambda_fee
    difference = abs(lambda_in - expected)
    
    if difference <= tolerance:
        return True, f"Conservation valid: Λ_in ({lambda_in:.6e}) = Λ_out ({lambda_out:.6e}) + Λ_fee ({lambda_fee:.6e})"
    else:
        return False, f"Conservation VIOLATED: Λ_in ({lambda_in:.6e}) ≠ Λ_out + Λ_fee ({expected:.6e}), diff={difference:.6e}"


def calculate_transaction_mass(
    nxt_amount: float,
    frequency_hz: float = 5e14,
    fee_rate: float = 0.001
) -> Dict[str, Any]:
    """
    Calculate Lambda mass components for a transaction.
    
    Args:
        nxt_amount: Transaction amount in NXT tokens
        frequency_hz: Base frequency (default 500 THz / green light)
        fee_rate: Fee percentage (default 0.1%)
    
    Returns:
        Dict with lambda_in, lambda_out, lambda_fee, and conservation status
    
    Example:
        tx = calculate_transaction_mass(100.0)
        print(f"Fee: {tx['lambda_fee']:.6e} kg")
    """
    energy = lambda_energy(frequency_hz)
    lambda_in = lambda_mass(frequency_hz)
    lambda_fee = lambda_in * fee_rate
    lambda_out = lambda_in - lambda_fee
    
    valid, reason = validate_conservation(lambda_in, lambda_out, lambda_fee)
    
    return {
        "nxt_amount": nxt_amount,
        "frequency_hz": frequency_hz,
        "energy_joules": energy,
        "lambda_in": lambda_in,
        "lambda_out": lambda_out,
        "lambda_fee": lambda_fee,
        "conserved": valid,
        "reason": reason
    }
