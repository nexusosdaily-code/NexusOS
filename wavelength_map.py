"""
Wavelength-Native Signaling Protocol (WNSP) - Wavelength Mapping Module

Mapping between alphabet letters (A-Z), their hex color representation,
and canonical wavelength (in nanometers) across the visible spectrum (380-740 nm).
"""

from typing import Optional, Dict, List
from dataclasses import dataclass


@dataclass
class LetterSymbol:
    """Symbol representation with letter, color, and wavelength."""
    letter: str
    hex_color: str
    wavelength_nm: float


# Hex colors for each letter A-Z (visible spectrum representation)
LETTER_COLORS = [
    "#8B00FF",  # A - deep violet
    "#7A00FF",  # B
    "#6900FF",  # C
    "#5800FF",  # D
    "#4700FF",  # E
    "#3600FF",  # F
    "#2500FF",  # G
    "#1400FF",  # H
    "#0300FF",  # I
    "#0040FF",  # J - blue
    "#0055FF",  # K
    "#006AFF",  # L
    "#0080FF",  # M - cyan-ish
    "#00A0FF",  # N
    "#00C0FF",  # O
    "#00E0FF",  # P
    "#00FFB0",  # Q
    "#40FF40",  # R - green
    "#80FF00",  # S
    "#AFFF00",  # T
    "#DFFF00",  # U
    "#FFFF00",  # V - yellow
    "#FFBF00",  # W
    "#FF8000",  # X - orange
    "#FF4000",  # Y
    "#FF0000",  # Z - red
]


def _generate_wavelengths() -> List[float]:
    """
    Evenly distribute wavelengths across the visible spectrum (380-740 nm)
    for the 26 letters A-Z.
    """
    min_nm = 380
    max_nm = 740
    count = 26
    step = (max_nm - min_nm) / (count - 1)  # 360 / 25 = 14.4
    
    return [round(min_nm + step * i) for i in range(count)]


LETTER_WAVELENGTHS = _generate_wavelengths()


def _create_alphabet_map() -> List[LetterSymbol]:
    """Create the full alphabet map A-Z."""
    symbols = []
    for i in range(26):
        letter = chr(ord('A') + i)
        symbols.append(LetterSymbol(
            letter=letter,
            hex_color=LETTER_COLORS[i],
            wavelength_nm=LETTER_WAVELENGTHS[i]
        ))
    return symbols


ALPHABET_MAP = _create_alphabet_map()


# Lookup table from letter to symbol
LETTER_TO_SYMBOL: Dict[str, LetterSymbol] = {
    symbol.letter: symbol for symbol in ALPHABET_MAP
}


def get_letter_info(letter: str) -> Optional[LetterSymbol]:
    """
    Get the symbol info (letter, hex_color, wavelength_nm) for a given letter.
    
    Args:
        letter: Single character A-Z (case insensitive)
        
    Returns:
        LetterSymbol if found, None otherwise
    """
    if not letter:
        return None
    upper = letter.upper()
    return LETTER_TO_SYMBOL.get(upper)


def get_wavelength_for_letter(letter: str) -> Optional[float]:
    """
    Get the canonical wavelength (nm) for a given letter.
    
    Args:
        letter: Single character A-Z (case insensitive)
        
    Returns:
        Wavelength in nanometers, or None if letter not found
    """
    info = get_letter_info(letter)
    return info.wavelength_nm if info else None


def get_letter_for_wavelength(wavelength_nm: float) -> Optional[str]:
    """
    Find the nearest defined letter for a given wavelength.
    
    Args:
        wavelength_nm: Wavelength in nanometers
        
    Returns:
        Nearest letter A-Z, or None if alphabet is empty
    """
    if not ALPHABET_MAP:
        return None
    
    best = ALPHABET_MAP[0]
    best_diff = abs(ALPHABET_MAP[0].wavelength_nm - wavelength_nm)
    
    for candidate in ALPHABET_MAP[1:]:
        diff = abs(candidate.wavelength_nm - wavelength_nm)
        if diff < best_diff:
            best = candidate
            best_diff = diff
    
    return best.letter


def wavelength_to_rgb(wavelength_nm: float) -> tuple:
    """
    Convert wavelength (nm) to approximate RGB color.
    Based on physics of visible light spectrum.
    
    Args:
        wavelength_nm: Wavelength in nanometers (380-740)
        
    Returns:
        Tuple of (R, G, B) values (0-255)
    """
    w = float(wavelength_nm)
    
    # Violet to blue (380-490 nm)
    if 380 <= w < 440:
        R = -(w - 440) / (440 - 380)
        G = 0.0
        B = 1.0
    # Blue to cyan (440-490 nm)
    elif 440 <= w < 490:
        R = 0.0
        G = (w - 440) / (490 - 440)
        B = 1.0
    # Cyan to green (490-510 nm)
    elif 490 <= w < 510:
        R = 0.0
        G = 1.0
        B = -(w - 510) / (510 - 490)
    # Green to yellow (510-580 nm)
    elif 510 <= w < 580:
        R = (w - 510) / (580 - 510)
        G = 1.0
        B = 0.0
    # Yellow to red (580-645 nm)
    elif 580 <= w < 645:
        R = 1.0
        G = -(w - 645) / (645 - 580)
        B = 0.0
    # Red (645-740 nm)
    elif 645 <= w <= 740:
        R = 1.0
        G = 0.0
        B = 0.0
    # Outside visible spectrum
    else:
        R = 0.0
        G = 0.0
        B = 0.0
    
    # Intensity correction at edges of visible spectrum
    if 380 <= w < 420:
        factor = 0.3 + 0.7 * (w - 380) / (420 - 380)
    elif 420 <= w <= 700:
        factor = 1.0
    elif 700 < w <= 740:
        factor = 0.3 + 0.7 * (740 - w) / (740 - 700)
    else:
        factor = 0.0
    
    # Convert to 0-255 range
    R = int(round(255 * R * factor))
    G = int(round(255 * G * factor))
    B = int(round(255 * B * factor))
    
    return (R, G, B)


def encode_message_to_wavelengths(message: str) -> List[float]:
    """
    Encode a text message into a sequence of wavelengths.
    
    Args:
        message: Text message containing A-Z characters
        
    Returns:
        List of wavelengths in nanometers
    """
    wavelengths = []
    for char in message.upper():
        if char.isalpha() and 'A' <= char <= 'Z':
            w = get_wavelength_for_letter(char)
            if w is not None:
                wavelengths.append(w)
    return wavelengths


def decode_wavelengths_to_message(wavelengths: List[float]) -> str:
    """
    Decode a sequence of wavelengths back into a text message.
    
    Args:
        wavelengths: List of wavelengths in nanometers
        
    Returns:
        Decoded text message
    """
    message = []
    for wavelength in wavelengths:
        letter = get_letter_for_wavelength(wavelength)
        if letter:
            message.append(letter)
    return ''.join(message)
