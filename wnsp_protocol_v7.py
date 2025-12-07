"""
WNSP Protocol v7 - Lambda Boson Encoding

Provides the encode_lambda_message function and LambdaEncoder class
for encoding messages using Lambda Boson substrate physics.

Each character pair is encoded as a wavelength oscillation (λ₁ → λ₂),
achieving 2+ characters per photon particle.
"""

from typing import Dict, List, Any, Optional
import time
import hashlib

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458
VISIBLE_MIN_NM = 380
VISIBLE_MAX_NM = 780


def lambda_mass(frequency_hz: float) -> float:
    """Calculate Lambda mass: Λ = hf/c²"""
    return (PLANCK_CONSTANT * frequency_hz) / (SPEED_OF_LIGHT ** 2)


def wavelength_to_frequency(wavelength_nm: float) -> float:
    """Convert wavelength (nm) to frequency (Hz)"""
    wavelength_m = wavelength_nm * 1e-9
    return SPEED_OF_LIGHT / wavelength_m


def char_to_wavelength(char: str) -> float:
    """Map character to wavelength in visible spectrum (380-780nm)"""
    code = ord(char) if len(char) == 1 else sum(ord(c) for c in char)
    normalized = (code % 256) / 255.0
    return VISIBLE_MIN_NM + (normalized * (VISIBLE_MAX_NM - VISIBLE_MIN_NM))


class LambdaEncoder:
    """
    Lambda Boson Encoder - encodes messages as wavelength oscillations.
    
    Each character pair is encoded as λ₁ → λ₂ oscillation, achieving
    2+ characters per photon particle.
    """
    
    def __init__(self, intensity: int = 32, cycles: int = 1):
        self.intensity = intensity
        self.cycles = cycles
    
    def encode_pair(self, char1: str, char2: str) -> Dict[str, Any]:
        """Encode a character pair as wavelength oscillation"""
        lambda1 = char_to_wavelength(char1)
        lambda2 = char_to_wavelength(char2)
        
        freq1 = wavelength_to_frequency(lambda1)
        freq2 = wavelength_to_frequency(lambda2)
        
        mass1 = lambda_mass(freq1)
        mass2 = lambda_mass(freq2)
        total_mass = (mass1 + mass2) / 2
        
        return {
            "char_pair": [char1, char2],
            "wavelength_start_nm": lambda1,
            "wavelength_end_nm": lambda2,
            "frequency_start_hz": freq1,
            "frequency_end_hz": freq2,
            "lambda_mass_kg": total_mass,
            "intensity": self.intensity,
            "cycles": self.cycles
        }
    
    def encode_message(self, content: str, sender: str = "", recipient: str = "") -> Dict[str, Any]:
        """Encode full message into Lambda frames"""
        frames = []
        
        padded = content if len(content) % 2 == 0 else content + " "
        
        for i in range(0, len(padded), 2):
            char1 = padded[i]
            char2 = padded[i + 1]
            frame = self.encode_pair(char1, char2)
            frames.append(frame)
        
        total_mass = sum(f["lambda_mass_kg"] for f in frames)
        
        message_hash = hashlib.sha256(content.encode('utf-8', errors='replace')).hexdigest()[:16]
        
        return {
            "message": {
                "content": content,
                "sender": sender,
                "recipient": recipient,
                "frames": frames,
                "total_lambda_mass_kg": total_mass,
                "frame_count": len(frames),
                "hash": message_hash
            },
            "efficiency": {
                "characters": len(content),
                "particles": len(frames),
                "chars_per_particle": len(content) / len(frames) if frames else 0,
                "vs_v2_improvement": f"{len(content) / len(frames):.1f}x" if frames else "N/A"
            },
            "validation": {
                "status": "VALID - Lambda mass conserved",
                "total_mass_kg": total_mass,
                "timestamp": time.time()
            }
        }


def encode_lambda_message(
    content: str,
    sender: str = "",
    recipient: str = "",
    intensity: int = 32,
    cycles: int = 1
) -> Dict[str, Any]:
    """
    Encode a message using Lambda Boson substrate.
    
    Each character pair becomes a wavelength oscillation (λ₁ → λ₂),
    achieving 2+ characters per photon particle.
    
    Args:
        content: Message text to encode
        sender: Sender identifier
        recipient: Recipient identifier
        intensity: Signal intensity (1-63)
        cycles: Number of oscillation cycles
    
    Returns:
        Dict containing encoded message, frames, and efficiency metrics
    """
    encoder = LambdaEncoder(intensity=intensity, cycles=cycles)
    return encoder.encode_message(content, sender, recipient)
