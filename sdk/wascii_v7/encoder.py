"""
W-ASCII v7 Encoder/Decoder

Encode text messages into W-ASCII v7 spectral format and decode back.

Example:
    from wascii_v7 import encode, decode
    
    encoded = encode("Hello!")
    decoded = decode(encoded)
    print(decoded)  # "Hello!"
"""

from typing import List, Dict, Any, Optional, Union
from .constants import WASCII_TABLE, CHAR_TO_CODE

def get_table() -> Dict[int, Dict[str, Any]]:
    """
    Get the complete W-ASCII v7 encoding table.
    
    Returns:
        Dict mapping hex codes (0x00-0xFF) to symbol properties:
        - hex: Hex string representation
        - char: Character/symbol
        - F: Frequency index (0-255)
        - A: Amplitude (0-3)
        - lambda: Lambda state (0-3)
        - description: Human-readable description
    
    Example:
        table = get_table()
        print(table[0x41])  # {'char': 'A', 'F': 65, 'A': 3, 'lambda': 1, ...}
    """
    return WASCII_TABLE.copy()


def encode_char(char: str) -> Optional[Dict[str, Any]]:
    """
    Encode a single character to W-ASCII v7 format.
    
    Args:
        char: Single character or symbol (e.g., 'A', 'Λ0', 'Ψ1')
    
    Returns:
        Dict with encoding properties, or None if not found:
        - code: Integer hex code
        - char: Original character
        - F: Frequency index
        - A: Amplitude
        - lambda: Lambda state
    
    Example:
        result = encode_char('A')
        # {'code': 65, 'char': 'A', 'F': 65, 'A': 3, 'lambda': 1}
    """
    # Check if it's a special multi-char symbol (Λ0, Ω1, etc.)
    if char in CHAR_TO_CODE:
        code = CHAR_TO_CODE[char]
        data = WASCII_TABLE[code]
        return {
            "code": code,
            "char": data["char"],
            "F": data["F"],
            "A": data["A"],
            "lambda": data["lambda"]
        }
    
    # Standard single character
    if len(char) == 1:
        code = ord(char)
        if code in WASCII_TABLE:
            data = WASCII_TABLE[code]
            return {
                "code": code,
                "char": data["char"],
                "F": data["F"],
                "A": data["A"],
                "lambda": data["lambda"]
            }
    
    return None


def decode_char(code: int) -> Optional[str]:
    """
    Decode a W-ASCII v7 code to its character representation.
    
    Args:
        code: Integer hex code (0-255)
    
    Returns:
        Character/symbol string, or None if invalid code
    
    Example:
        char = decode_char(0x41)  # Returns 'A'
        char = decode_char(0x80)  # Returns 'Λ0'
    """
    if code in WASCII_TABLE:
        return WASCII_TABLE[code]["char"]
    return None


def encode(message: str) -> List[Dict[str, Any]]:
    """
    Encode a text message to W-ASCII v7 spectral format.
    
    Args:
        message: Text string to encode
    
    Returns:
        List of encoded symbols, each containing:
        - code: Integer hex code
        - char: Original character
        - F: Frequency index
        - A: Amplitude
        - lambda: Lambda state
    
    Example:
        encoded = encode("Hello")
        for sym in encoded:
            print(f"{sym['char']}: F={sym['F']}, λ={sym['lambda']}")
    """
    result = []
    i = 0
    
    while i < len(message):
        # Check for multi-character symbols (Λ0, Ω1, Ψ2, Φ0, etc.)
        found = False
        for length in [2, 3]:  # Check 2-char and 3-char symbols
            if i + length <= len(message):
                potential = message[i:i+length]
                if potential in CHAR_TO_CODE:
                    encoded = encode_char(potential)
                    if encoded:
                        result.append(encoded)
                        i += length
                        found = True
                        break
        
        if not found:
            # Single character
            char = message[i]
            encoded = encode_char(char)
            if encoded:
                result.append(encoded)
            else:
                # Unknown character - use replacement
                result.append({
                    "code": ord(char) if len(char) == 1 else 0,
                    "char": char,
                    "F": 0,
                    "A": 0,
                    "lambda": 0
                })
            i += 1
    
    return result


def decode(encoded: Union[List[Dict[str, Any]], List[int]]) -> str:
    """
    Decode W-ASCII v7 encoded data back to text.
    
    Args:
        encoded: Either:
            - List of encoded dicts from encode()
            - List of integer codes
    
    Returns:
        Decoded text string
    
    Example:
        encoded = encode("Hello")
        text = decode(encoded)  # "Hello"
        
        # Or decode from codes directly
        text = decode([0x48, 0x65, 0x6C, 0x6C, 0x6F])  # "Hello"
    """
    result = []
    
    for item in encoded:
        if isinstance(item, dict):
            # Encoded dict format
            code = item.get("code", 0)
            char = decode_char(code)
            if char:
                result.append(char)
            else:
                result.append(item.get("char", "?"))
        elif isinstance(item, int):
            # Raw code
            char = decode_char(item)
            if char:
                result.append(char)
            else:
                result.append("?")
    
    return "".join(result)


def to_spectral_array(message: str) -> List[tuple]:
    """
    Convert message to spectral (F, A, λ) array for signal processing.
    
    Args:
        message: Text string to convert
    
    Returns:
        List of (Frequency, Amplitude, Lambda) tuples
    
    Example:
        spectral = to_spectral_array("Hi")
        # [(72, 3, 0), (105, 3, 1)]
    """
    encoded = encode(message)
    return [(e["F"], e["A"], e["lambda"]) for e in encoded]


def from_spectral_array(spectral: List[tuple]) -> str:
    """
    Convert spectral array back to text.
    
    Args:
        spectral: List of (F, A, λ) tuples
    
    Returns:
        Decoded text string
    
    Note: Only uses F (frequency) for decoding since it maps to character code.
    """
    codes = [f for f, a, l in spectral]
    return decode(codes)
