"""
WNSP v7.0 — Harmonic Octave Protocol
Standalone package for harmonic resonance-based networking.

"Energy is alternating wavelength frequency vibration octave tone"

This package is intentionally separate from the core WNSP protocol stack
to allow independent development of Lambda Boson computational substrate.
"""

from .protocol import (
    Octave,
    HarmonicRatio,
    ToneSignature,
    CarrierWave,
    HarmonicPayload,
    HarmonicPacket,
    ExcitationState,
    ExcitationEvent,
    HarmonicNode,
    HarmonicNetwork,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT,
    A4_FREQUENCY,
    convert_v6_to_v7,
    convert_v7_to_v6,
)

__version__ = "7.0.0"
__all__ = [
    "Octave",
    "HarmonicRatio", 
    "ToneSignature",
    "CarrierWave",
    "HarmonicPayload",
    "HarmonicPacket",
    "ExcitationState",
    "ExcitationEvent",
    "HarmonicNode",
    "HarmonicNetwork",
    "PLANCK_CONSTANT",
    "SPEED_OF_LIGHT",
    "A4_FREQUENCY",
    "convert_v6_to_v7",
    "convert_v7_to_v6",
]
