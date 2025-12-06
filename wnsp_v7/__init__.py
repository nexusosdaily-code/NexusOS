"""
WNSP v7.0 — Harmonic Octave Protocol with Lambda Boson Substrate
Standalone package for harmonic resonance-based networking.

"Energy is alternating wavelength frequency vibration octave tone"

Theoretical Foundation:
- E = hf (Planck 1900): Energy from frequency
- E = mc² (Einstein 1905): Mass-energy equivalence  
- Λ = hf/c² (Lambda Boson 2024): Oscillation IS mass

This package implements the Lambda Boson computational substrate,
where messages ARE oscillation, not bytes tagged with wavelength.
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

from .substrate import (
    OscillatorState,
    OscillationRegister,
    SubstrateEncoder,
    MassLedger,
    MassLedgerEntry,
    StandingWave,
    StandingWaveRegistry,
    GravitationalNode,
    GravitationalField,
    OscillationField,
    lambda_mass_from_frequency,
    lambda_mass_from_wavelength,
    energy_from_lambda,
    frequency_from_lambda,
)

from .mass_routing import (
    MassRoute,
    MassWeightedRouter,
    SubstrateNode,
    SubstrateNetwork,
)

from .consciousness import (
    ConsciousnessLevel,
    SpectralBand,
    StokesVector,
    ConsciousNode,
    ConsciousnessNetwork,
    get_consciousness_network,
)

from .substrate_coordinator import (
    OperationType,
    SubstrateTransaction,
    SubstrateCoordinator,
    get_substrate_coordinator,
    validate_substrate_transaction,
    FOUNDER_WALLET,
)

__version__ = "7.1.0"
__all__ = [
    # Protocol layer
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
    # Constants
    "PLANCK_CONSTANT",
    "SPEED_OF_LIGHT",
    "A4_FREQUENCY",
    # Converters
    "convert_v6_to_v7",
    "convert_v7_to_v6",
    # Substrate layer
    "OscillatorState",
    "OscillationRegister",
    "SubstrateEncoder",
    "MassLedger",
    "MassLedgerEntry",
    "StandingWave",
    "StandingWaveRegistry",
    "GravitationalNode",
    "GravitationalField",
    "OscillationField",
    # Mass routing
    "MassRoute",
    "MassWeightedRouter",
    "SubstrateNode",
    "SubstrateNetwork",
    # Utility functions
    "lambda_mass_from_frequency",
    "lambda_mass_from_wavelength",
    "energy_from_lambda",
    "frequency_from_lambda",
    # Consciousness layer (merged from v6)
    "ConsciousnessLevel",
    "SpectralBand",
    "StokesVector",
    "ConsciousNode",
    "ConsciousnessNetwork",
    "get_consciousness_network",
    # Substrate coordinator (links ALL modules)
    "OperationType",
    "SubstrateTransaction",
    "SubstrateCoordinator",
    "get_substrate_coordinator",
    "validate_substrate_transaction",
    "FOUNDER_WALLET",
]
