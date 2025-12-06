"""
NexusOS Governance Module

Constitutional enforcement for physics-based civilization governance.
Implements NexusOS Constitution v1 with 3 core clauses:
- C-0001: Non-Dominance (no entity >5% authority without PLANCK consensus)
- C-0002: Immutable Rights (basic rights protected at YOCTO level)
- C-0003: Energy-Backed Validity (system actions require energy escrow)
"""

from governance.enforcer import (
    ConstitutionalEnforcer,
    EnforcementResult,
    EnforcementStatus,
    compute_energy_units,
    enforce_frame,
    BAND_LEVEL_MAP,
    GLOBAL_ENFORCER
)

__all__ = [
    'ConstitutionalEnforcer',
    'EnforcementResult',
    'EnforcementStatus',
    'compute_energy_units',
    'enforce_frame',
    'BAND_LEVEL_MAP',
    'GLOBAL_ENFORCER'
]
