"""
W-ASCII v7 Constants and Symbol Tables

This module defines the complete 256-symbol W-ASCII v7 encoding table
and special symbol groups (Lambda, Omega, Phi, Psi).
"""

# Physical Constants
PLANCK_CONSTANT = 6.62607015e-34  # Joule-seconds (exact, SI 2019)
SPEED_OF_LIGHT = 299792458  # meters/second (exact)

# Lambda Symbols (0x80-0x83) - Core informational modes
LAMBDA_SYMBOLS = {
    0x80: {"char": "Λ0", "name": "Lambda-null", "lambda": 0},
    0x81: {"char": "Λ1", "name": "Lambda-data", "lambda": 1},
    0x82: {"char": "Λ2", "name": "Lambda-extended", "lambda": 2},
    0x83: {"char": "Λ3", "name": "Lambda-high", "lambda": 3},
}

# Omega Symbols (0x84-0x85) - Spectral signals
OMEGA_SYMBOLS = {
    0x84: {"char": "Ω0", "name": "Omega-base", "lambda": 0},
    0x85: {"char": "Ω1", "name": "Omega-data", "lambda": 1},
}

# Phi/Phase Symbols (0x86-0x87) - Phase modulation
PHI_SYMBOLS = {
    0x86: {"char": "Φ0", "name": "Phase-base", "lambda": 2},
    0x87: {"char": "Φ1", "name": "Phase-data", "lambda": 3},
}

# Psi Symbols (0x88-0x8B) - High-intensity spectral
PSI_SYMBOLS = {
    0x88: {"char": "Ψ0", "name": "Psi-base", "lambda": 0},
    0x89: {"char": "Ψ1", "name": "Psi-data", "lambda": 1},
    0x8A: {"char": "Ψ2", "name": "Psi-extended", "lambda": 2},
    0x8B: {"char": "Ψ3", "name": "Psi-high", "lambda": 3},
}

def _generate_wascii_table():
    """Generate the complete 256-symbol W-ASCII v7 table."""
    table = {}
    
    # Control characters (0x00-0x1F)
    control_names = [
        "NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL",
        "BS", "HT", "LF", "VT", "FF", "CR", "SO", "SI",
        "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB",
        "CAN", "EM", "SUB", "ESC", "FS", "GS", "RS", "US"
    ]
    
    for i, name in enumerate(control_names):
        table[i] = {
            "hex": hex(i),
            "char": name,
            "F": i,
            "A": 0,
            "lambda": i % 4,
            "description": f"Control: {name}"
        }
    
    # Printable ASCII (0x20-0x7E)
    for code in range(0x20, 0x7F):
        char = chr(code)
        table[code] = {
            "hex": hex(code),
            "char": char,
            "F": code,
            "A": 3 if char.isalpha() else (2 if char.isdigit() else (1 if char in "!@#$%^&*" else 0)),
            "lambda": code % 4,
            "description": f"ASCII: {char}"
        }
    
    # DEL (0x7F)
    table[0x7F] = {
        "hex": "0x7f",
        "char": "DEL",
        "F": 127,
        "A": 3,
        "lambda": 2,
        "description": "Delete"
    }
    
    # Extended symbols (0x80-0xFF)
    # Lambda symbols
    for code, data in LAMBDA_SYMBOLS.items():
        table[code] = {
            "hex": hex(code),
            "char": data["char"],
            "F": code,
            "A": 0,
            "lambda": data["lambda"],
            "description": data["name"]
        }
    
    # Omega symbols
    for code, data in OMEGA_SYMBOLS.items():
        table[code] = {
            "hex": hex(code),
            "char": data["char"],
            "F": code,
            "A": 1,
            "lambda": data["lambda"],
            "description": data["name"]
        }
    
    # Phi symbols
    for code, data in PHI_SYMBOLS.items():
        table[code] = {
            "hex": hex(code),
            "char": data["char"],
            "F": code,
            "A": 1,
            "lambda": data["lambda"],
            "description": data["name"]
        }
    
    # Psi symbols
    for code, data in PSI_SYMBOLS.items():
        table[code] = {
            "hex": hex(code),
            "char": data["char"],
            "F": code,
            "A": 2,
            "lambda": data["lambda"],
            "description": data["name"]
        }
    
    # Fill remaining extended (0x8C-0xFF) with Lambda extended
    for code in range(0x8C, 0x100):
        offset = code - 0x8C
        table[code] = {
            "hex": hex(code),
            "char": f"Λ{offset+4:X}",
            "F": code,
            "A": offset % 4,
            "lambda": offset % 4,
            "description": f"Lambda-extended-{offset+4}"
        }
    
    return table

# Generate the complete table
WASCII_TABLE = _generate_wascii_table()

# Reverse lookup: char -> code
CHAR_TO_CODE = {}
for code, data in WASCII_TABLE.items():
    CHAR_TO_CODE[data["char"]] = code
