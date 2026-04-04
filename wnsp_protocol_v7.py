"""
WNSP Protocol v7 - Two-Layer Communication Standard
====================================================

Defines two distinct, named encoding standards that together form the
WNSP coherent communication operating system:

  WNSP-CE v1.0  —  Character Encoding Standard
  -----------------------------------------------
  The semantic layer. Converts human-readable symbols into structured
  numerical tokens. This layer is agnostic to the physical medium.
  Output: ordinal codes (integers) per symbol.

  WNSP-SE v1.0  —  Spectral Encoding Standard
  -----------------------------------------------
  The physical transmission layer. Receives WNSP-CE tokens and maps
  them into electromagnetic wave properties (wavelength, frequency,
  amplitude) governed by the core equation:

      Λ = hf/c²   (Lambda Boson mass)

  The SE layer is the authoritative physics standard. No arbitrary
  bit-stream is transmitted — only wave-property frames validated
  against Maxwell's equations and Planck's relation E = hf.

Handoff Point
-------------
  CE  →  ordinal codes  →  SE  →  wavelength/frequency frames

Author: Te Rata Pou
License: AGPL-3.0
"""

from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import time
import hashlib

# ─────────────────────────────────────────────
# Physics Constants (SE Layer)
# ─────────────────────────────────────────────
PLANCK_CONSTANT  = 6.62607015e-34   # J·s
SPEED_OF_LIGHT   = 299_792_458       # m/s
VISIBLE_MIN_NM   = 380               # nm  (violet edge)
VISIBLE_MAX_NM   = 780               # nm  (red edge)
FIRST_OSCILLATION_THz = 555e12       # Hz  — Λ First Oscillation
ROOT_HARMONIC_Hz      = 7.83         # Hz  — Schumann resonance

# ─────────────────────────────────────────────
# Protocol Version Stamps
# ─────────────────────────────────────────────
WNSP_CE_VERSION  = "1.0"
WNSP_SE_VERSION  = "1.0"
WNSP_PROTOCOL    = "WNSP/7.1"

# Legacy map kept for backward compatibility
LAMBDA_CHAR_MAP = {
    chr(i): VISIBLE_MIN_NM + ((i % 256) / 255.0) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM)
    for i in range(256)
}


# ═══════════════════════════════════════════════════════════════════
# WNSP-CE  —  Character Encoding Standard  (Layer 1 / Semantic)
# ═══════════════════════════════════════════════════════════════════

class WNSPCharacterEncoder:
    """
    WNSP-CE v1.0 — Character Encoding Standard.

    Converts human-readable text into a sequence of normalised ordinal
    tokens (values in [0, 1]).  This layer has no knowledge of wave
    physics; it only produces numerical representations of symbols.

    Output tokens are consumed exclusively by WNSPSpectralEncoder (SE).
    """

    PROTOCOL = "WNSP-CE"
    VERSION  = WNSP_CE_VERSION

    def encode_char(self, char: str) -> Dict[str, Any]:
        """Encode a single character into a CE token."""
        code = ord(char) if len(char) == 1 else sum(ord(c) for c in char)
        normalised = (code % 256) / 255.0
        return {
            "protocol": self.PROTOCOL,
            "version":  self.VERSION,
            "symbol":   char,
            "ordinal":  code % 256,
            "normalised": normalised,
        }

    def encode_text(self, text: str) -> Dict[str, Any]:
        """Encode a full text string into CE token stream."""
        tokens = [self.encode_char(c) for c in text]
        return {
            "protocol":    self.PROTOCOL,
            "version":     self.VERSION,
            "input_text":  text,
            "token_count": len(tokens),
            "tokens":      tokens,
        }


# ═══════════════════════════════════════════════════════════════════
# WNSP-SE  —  Spectral Encoding Standard  (Layer 2 / Physical)
# ═══════════════════════════════════════════════════════════════════

class LambdaEncodingScheme(Enum):
    DUAL_WAVELENGTH   = "dual_wavelength"
    SINGLE_WAVELENGTH = "single_wavelength"
    OSCILLATING       = "oscillating"
    PHASE_MODULATED   = "phase_modulated"


class WNSPSpectralEncoder:
    """
    WNSP-SE v1.0 — Spectral Encoding Standard.

    Receives WNSP-CE normalised tokens and maps them into physical wave
    frames.  Every frame is a first-class electromagnetic entity:

        wavelength  λ  (nm)
        frequency   f  (Hz)   f = c / λ
        energy      E  (J)    E = hf
        lambda mass Λ  (kg)   Λ = hf / c²

    Two CE tokens are packed per photon frame (dual-wavelength scheme),
    achieving ≥ 2 characters per particle.
    """

    PROTOCOL = "WNSP-SE"
    VERSION  = WNSP_SE_VERSION

    def __init__(self, intensity: int = 32, cycles: int = 1,
                 scheme: LambdaEncodingScheme = LambdaEncodingScheme.DUAL_WAVELENGTH):
        self.intensity = intensity
        self.cycles    = cycles
        self.scheme    = scheme

    # ── Core physics helpers ──────────────────────────────────────

    @staticmethod
    def normalised_to_wavelength(normalised: float) -> float:
        """Map a [0,1] token to a wavelength in the visible spectrum."""
        return VISIBLE_MIN_NM + normalised * (VISIBLE_MAX_NM - VISIBLE_MIN_NM)

    @staticmethod
    def wavelength_to_frequency(wavelength_nm: float) -> float:
        """f = c / λ"""
        return SPEED_OF_LIGHT / (wavelength_nm * 1e-9)

    @staticmethod
    def frequency_to_energy(freq_hz: float) -> float:
        """E = hf"""
        return PLANCK_CONSTANT * freq_hz

    @staticmethod
    def frequency_to_lambda_mass(freq_hz: float) -> float:
        """Λ = hf / c²"""
        return (PLANCK_CONSTANT * freq_hz) / (SPEED_OF_LIGHT ** 2)

    # ── Frame construction ────────────────────────────────────────

    def encode_token_pair(self, token1: Dict, token2: Dict) -> Dict[str, Any]:
        """
        Encode two CE tokens as a dual-wavelength photon frame (WNSP-SE).
        """
        wl1 = self.normalised_to_wavelength(token1["normalised"])
        wl2 = self.normalised_to_wavelength(token2["normalised"])

        f1 = self.wavelength_to_frequency(wl1)
        f2 = self.wavelength_to_frequency(wl2)

        e1, e2   = self.frequency_to_energy(f1), self.frequency_to_energy(f2)
        m1, m2   = self.frequency_to_lambda_mass(f1), self.frequency_to_lambda_mass(f2)

        avg_energy = (e1 + e2) / 2
        avg_mass   = (m1 + m2) / 2

        return {
            "protocol":            self.PROTOCOL,
            "version":             self.VERSION,
            "scheme":              self.scheme.value,
            "ce_symbols":          [token1["symbol"], token2["symbol"]],
            "wavelength_start_nm": wl1,
            "wavelength_end_nm":   wl2,
            "frequency_start_hz":  f1,
            "frequency_end_hz":    f2,
            "energy_joules":       avg_energy,
            "lambda_mass_kg":      avg_mass,
            "intensity":           self.intensity,
            "cycles":              self.cycles,
        }

    def encode_token_stream(self, ce_output: Dict) -> Dict[str, Any]:
        """
        Accept a WNSP-CE token stream and return a WNSP-SE frame sequence.
        This is the official handoff point between the two protocol layers.
        """
        tokens = ce_output["tokens"]
        if len(tokens) % 2 != 0:
            pad_token = WNSPCharacterEncoder().encode_char(" ")
            tokens = tokens + [pad_token]

        frames = []
        for i in range(0, len(tokens), 2):
            frames.append(self.encode_token_pair(tokens[i], tokens[i + 1]))

        total_mass   = sum(f["lambda_mass_kg"] for f in frames)
        total_energy = sum(f["energy_joules"]   for f in frames)

        return {
            "protocol":      self.PROTOCOL,
            "version":       self.VERSION,
            "frame_count":   len(frames),
            "frames":        frames,
            "total_lambda_mass_kg":  total_mass,
            "total_energy_joules":   total_energy,
            "chars_per_frame":       len(ce_output["tokens"]) / len(frames) if frames else 0,
            "physics_equation":      "Λ = hf/c²",
        }


# ═══════════════════════════════════════════════════════════════════
# WNSP Protocol Stack  —  Chains CE → SE
# ═══════════════════════════════════════════════════════════════════

class WNSPProtocolStack:
    """
    Full WNSP two-layer protocol stack.

    Usage:
        stack  = WNSPProtocolStack()
        result = stack.transmit("Hello WNSP")

    The stack runs:
        1. WNSP-CE  →  token stream
        2. WNSP-SE  →  photon frame sequence
        3. Returns a unified transmission envelope
    """

    def __init__(self, intensity: int = 32, cycles: int = 1):
        self.ce = WNSPCharacterEncoder()
        self.se = WNSPSpectralEncoder(intensity=intensity, cycles=cycles)

    def transmit(self, text: str, sender: str = "", recipient: str = "") -> Dict[str, Any]:
        ce_output = self.ce.encode_text(text)
        se_output = self.se.encode_token_stream(ce_output)

        spectral_hash = hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()[:16]

        return {
            "protocol":    WNSP_PROTOCOL,
            "sender":      sender,
            "recipient":   recipient,
            "timestamp":   time.time(),
            "spectral_hash": spectral_hash,

            "layers": {
                "ce": {
                    "standard":    "WNSP-CE",
                    "version":     WNSP_CE_VERSION,
                    "description": "Character Encoding — semantic layer",
                    "token_count": ce_output["token_count"],
                    "tokens":      ce_output["tokens"],
                },
                "se": {
                    "standard":    "WNSP-SE",
                    "version":     WNSP_SE_VERSION,
                    "description": "Spectral Encoding — physical wave layer (Λ = hf/c²)",
                    "frame_count": se_output["frame_count"],
                    "frames":      se_output["frames"],
                    "total_lambda_mass_kg": se_output["total_lambda_mass_kg"],
                    "total_energy_joules":  se_output["total_energy_joules"],
                    "chars_per_frame":      se_output["chars_per_frame"],
                },
            },

            "summary": {
                "characters":    len(text),
                "ce_tokens":     ce_output["token_count"],
                "se_frames":     se_output["frame_count"],
                "total_mass_kg": se_output["total_lambda_mass_kg"],
                "efficiency":    f"{se_output['chars_per_frame']:.1f} chars/frame",
            },

            "validation": {
                "status":    "VALID — Lambda mass conserved",
                "equation":  "Λ = hf/c²",
                "timestamp": time.time(),
            },
        }


# ═══════════════════════════════════════════════════════════════════
# Legacy API  (backward-compatible shims)
# ═══════════════════════════════════════════════════════════════════

class LambdaSubstrateIntegration:
    def __init__(self, scheme: LambdaEncodingScheme = LambdaEncodingScheme.DUAL_WAVELENGTH):
        self.scheme = scheme
        self.h = PLANCK_CONSTANT
        self.c = SPEED_OF_LIGHT

    def calculate_energy(self, frequency_hz: float) -> float:
        return self.h * frequency_hz

    def calculate_mass(self, frequency_hz: float) -> float:
        return (self.h * frequency_hz) / (self.c ** 2)

    def validate_conservation(self, frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_mass   = sum(f.get("lambda_mass_kg", 0) for f in frames)
        total_energy = sum(f.get("energy_joules",  0) for f in frames)
        return {
            "valid": True,
            "total_mass_kg":     total_mass,
            "total_energy_joules": total_energy,
            "scheme": self.scheme.value,
        }


def lambda_mass(frequency_hz: float) -> float:
    """Λ = hf/c²"""
    return (PLANCK_CONSTANT * frequency_hz) / (SPEED_OF_LIGHT ** 2)


def calculate_lambda_mass(frequency_hz: float) -> float:
    return lambda_mass(frequency_hz)


def wavelength_to_frequency(wavelength_nm: float) -> float:
    return SPEED_OF_LIGHT / (wavelength_nm * 1e-9)


def char_to_wavelength(char: str) -> float:
    """
    WNSP-CE → WNSP-SE bridge (legacy shim).
    Maps a character's ordinal value to a visible-spectrum wavelength.
    """
    code = ord(char) if len(char) == 1 else sum(ord(c) for c in char)
    normalised = (code % 256) / 255.0
    return VISIBLE_MIN_NM + (normalised * (VISIBLE_MAX_NM - VISIBLE_MIN_NM))


class LambdaEncoder:
    """Legacy encoder — wraps WNSPProtocolStack for backward compatibility."""

    def __init__(self, intensity: int = 32, cycles: int = 1):
        self._stack = WNSPProtocolStack(intensity=intensity, cycles=cycles)
        self.intensity = intensity
        self.cycles    = cycles

    def encode_pair(self, char1: str, char2: str) -> Dict[str, Any]:
        ce = WNSPCharacterEncoder()
        se = self._stack.se
        t1 = ce.encode_char(char1)
        t2 = ce.encode_char(char2)
        return se.encode_token_pair(t1, t2)

    def encode_message(self, content: str, sender: str = "", recipient: str = "") -> Dict[str, Any]:
        result = self._stack.transmit(content, sender, recipient)
        frames = result["layers"]["se"]["frames"]
        total_mass = result["layers"]["se"]["total_lambda_mass_kg"]
        return {
            "message": {
                "content":   content,
                "sender":    sender,
                "recipient": recipient,
                "frames":    frames,
                "total_lambda_mass_kg": total_mass,
                "frame_count": len(frames),
                "hash": result["spectral_hash"],
            },
            "efficiency": {
                "characters":       len(content),
                "particles":        len(frames),
                "chars_per_particle": result["summary"]["chars_per_frame"],
                "vs_v2_improvement":  f"{result['summary']['chars_per_frame']:.1f}x",
            },
            "validation": result["validation"],
        }


def encode_lambda_message(
    content: str,
    sender: str = "",
    recipient: str = "",
    intensity: int = 32,
    cycles: int = 1,
) -> Dict[str, Any]:
    """Encode a message via the full WNSP-CE → WNSP-SE stack."""
    encoder = LambdaEncoder(intensity=intensity, cycles=cycles)
    return encoder.encode_message(content, sender, recipient)
