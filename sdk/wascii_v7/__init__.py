"""
WASCII v7 SDK - Wavelength-Native Signalling Protocol

A Python SDK for encoding/decoding messages using the W-ASCII v7 standard,
which maps characters to electromagnetic wavelength properties.

Quick Start:
    from wascii_v7 import encode, decode, lambda_mass
    
    # Encode a message
    encoded = encode("Hello WNSP!")
    
    # Decode back
    decoded = decode(encoded)
    
    # Calculate Lambda mass for a frequency
    mass = lambda_mass(5e14)  # 500 THz (green light)

License: GPLv3
Repository: https://github.com/nexusosdaily-code/WNSP-P2P-Hub
"""

__version__ = "7.1.0"
__author__ = "NexusOS WNSP Developers"
__license__ = "GPLv3"

from .encoder import encode, decode, encode_char, decode_char, get_table
from .lambda_mass import (
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
from .constants import (
    WASCII_TABLE,
    LAMBDA_SYMBOLS,
    OMEGA_SYMBOLS,
    PHI_SYMBOLS,
    PSI_SYMBOLS
)

__all__ = [
    # Encoder functions
    'encode',
    'decode', 
    'encode_char',
    'decode_char',
    'get_table',
    
    # Lambda mass functions
    'lambda_mass',
    'lambda_energy',
    'validate_conservation',
    'calculate_transaction_mass',
    'frequency_from_wavelength',
    'wavelength_from_frequency',
    'is_visible_light',
    
    # Constants
    'PLANCK_CONSTANT',
    'SPEED_OF_LIGHT',
    'WASCII_TABLE',
    'LAMBDA_SYMBOLS',
    'OMEGA_SYMBOLS',
    'PHI_SYMBOLS',
    'PSI_SYMBOLS',
]
