"""
WNSP Physics Constants — Single Source of Truth
================================================

All physical constants used across the WNSP protocol and NexusOS modules
are defined here.  Every other module must import from this file instead
of defining its own copies.

Sources / standards
-------------------
- PLANCK_CONSTANT, SPEED_OF_LIGHT, EV_PER_JOULE : CODATA 2018 / 2019 SI
- VACUUM_PERMITTIVITY, VACUUM_PERMEABILITY        : SI derived
- A4_FREQUENCY, FIRST_OSCILLATION_THz, ROOT_HARMONIC_Hz : WNSP protocol specs

License: AGPL-3.0
"""

# ─────────────────────────────────────────────
# Core electromagnetic / quantum constants
# ─────────────────────────────────────────────
PLANCK_CONSTANT = 6.62607015e-34        # J·s  (exact, 2019 SI definition)
SPEED_OF_LIGHT  = 299_792_458           # m/s  (exact, 1983 SI definition)
EV_PER_JOULE    = 1.602_176_634e-19     # J/eV (exact, 2019 SI definition)

# ─────────────────────────────────────────────
# Vacuum medium constants
# ─────────────────────────────────────────────
VACUUM_PERMITTIVITY  = 8.854_187_812_8e-12  # F/m  (electric constant ε₀, CODATA 2018)
VACUUM_PERMEABILITY  = 1.256_637_062_12e-6  # H/m  (magnetic constant μ₀, CODATA 2018)

# ─────────────────────────────────────────────
# WNSP spectral / protocol constants
# ─────────────────────────────────────────────
A4_FREQUENCY           = 440.0       # Hz  — concert pitch reference tone
PLANCK_FREQUENCY       = 1.85e43    # Hz  — Planck frequency
VISIBLE_MIN_NM         = 380        # nm  — violet edge of visible spectrum
VISIBLE_MAX_NM         = 780        # nm  — red edge of visible spectrum
FIRST_OSCILLATION_THz  = 555e12     # Hz  — Λ First Oscillation
ROOT_HARMONIC_Hz       = 7.83       # Hz  — Schumann resonance

# ─────────────────────────────────────────────
# Derived constants (computed once, exported for convenience)
# ─────────────────────────────────────────────
import math as _math
HBAR = PLANCK_CONSTANT / (2 * _math.pi)  # ℏ  (reduced Planck constant)
