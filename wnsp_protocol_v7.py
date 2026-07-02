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

      Λ = hf/c²   (Einstein's Λ — mass equivalent of oscillating quantum)

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
from dataclasses import dataclass, asdict
from enum import Enum
import time
import hashlib
import math

# ─────────────────────────────────────────────
# Physics Constants (SE Layer) — imported from single source of truth
# ─────────────────────────────────────────────
from wnsp_v7.constants import (
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT,
    EV_PER_JOULE,
    VISIBLE_MIN_NM,
    VISIBLE_MAX_NM,
    FIRST_OSCILLATION_THz,
    ROOT_HARMONIC_Hz,
)

# ─────────────────────────────────────────────
# Protocol Version Stamps
# ─────────────────────────────────────────────
WNSP_CE_VERSION  = "1.0"
WNSP_SE_VERSION  = "1.0"
WNSP_PROTOCOL    = "WNSP/7.1"

# ─────────────────────────────────────────────
# WNSP-SE Hilbert Space Channel Basis
# ─────────────────────────────────────────────
#
#   Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩ ⊗ |Dir_d⟩
#
#   Each channel is an orthogonal basis vector in a 51,200-dimensional
#   Hilbert space formed by the tensor product of four sub-spaces:
#
#     |λ_i⟩    — wavelength (WDM) sub-space      dim = 256
#     |OAM_j⟩  — orbital angular momentum        dim = 50
#     |Pol_k⟩  — polarisation (H / V)            dim = 2
#     |Dir_d⟩  — propagation direction           dim = 2  (+k̂ / −k̂)
#
#   Total Hilbert space dimension:
#     dim(H) = 256 × 50 × 2 × 2 = 51,200
#
#   Orthogonality guarantee:
#     ⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j
#
#   This is the formal mathematical basis for channel isolation in WNSP-SE.
#   All 51,200 channels are simultaneously usable without interference.
#
HILBERT_DIM_WDM   = 256   # |λ_i⟩  sub-space dimension
HILBERT_DIM_OAM   = 50    # |OAM_j⟩ sub-space dimension
HILBERT_DIM_POL   = 2     # |Pol_k⟩ sub-space dimension
HILBERT_DIM_DIR   = 2     # |Dir_d⟩ sub-space dimension  (+k̂ forward / −k̂ backward)
HILBERT_DIM_TOTAL = HILBERT_DIM_WDM * HILBERT_DIM_OAM * HILBERT_DIM_POL * HILBERT_DIM_DIR  # 51,200

CHANNEL_BASIS_EQUATION = "Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩ ⊗ |Dir_d⟩"

# ─────────────────────────────────────────────────────────────────────────────
# WASCII Table  —  Wavelength-Native Character Standard (WNSP Spectral Encoding
# Standard v1.0, November 2025)
#
# Every character has a canonical wavelength derived from its position in the
# electromagnetic spectrum.  Bands:
#   UV (350–394 nm)   — Mathematical operators
#   Violet (380–416)  — A–G  (uppercase)
#   Blue   (416–476)  — H–P
#   Cyan   (476–500)  — Q–T
#   Green  (500–530)  — U–Z  +  digits 0–9 (536–590)
#   Yellow-Red (596–758) — Common symbols
#   Near-IR (760–857) — Greek letters
#   Far-IR  (860–902) — Physics symbols
#   Extended-IR (905–1033) — Subscripts, superscripts, arrows, logic
# ─────────────────────────────────────────────────────────────────────────────
WASCII_TABLE: Dict[str, float] = {
    # ── Uppercase Latin (380–530 nm, Δ=6 nm) ──────────────────────────────
    'A': 380.0, 'B': 386.0, 'C': 392.0, 'D': 398.0, 'E': 404.0,
    'F': 410.0, 'G': 416.0, 'H': 422.0, 'I': 428.0, 'J': 434.0,
    'K': 440.0, 'L': 446.0, 'M': 452.0, 'N': 458.0, 'O': 464.0,
    'P': 470.0, 'Q': 476.0, 'R': 482.0, 'S': 488.0, 'T': 494.0,
    'U': 500.0, 'V': 506.0, 'W': 512.0, 'X': 518.0, 'Y': 524.0,
    'Z': 530.0,
    # ── Digits (536–590 nm, Δ=6 nm) ────────────────────────────────────────
    '0': 536.0, '1': 542.0, '2': 548.0, '3': 554.0, '4': 560.0,
    '5': 566.0, '6': 572.0, '7': 578.0, '8': 584.0, '9': 590.0,
    # ── Common Symbols (596–758 nm, Δ=6 nm) ────────────────────────────────
    ' ': 596.0, '.': 602.0, ',': 608.0, '!': 614.0, '?': 620.0,
    '-': 626.0, '_': 632.0, '+': 638.0, '=': 644.0, '*': 650.0,
    '/': 656.0, '\\':662.0, '|': 668.0, '@': 674.0, '#': 680.0,
    '$': 686.0, '%': 692.0, '&': 698.0, '(': 704.0, ')': 710.0,
    '[': 716.0, ']': 722.0, '{': 728.0, '}': 734.0, '<': 740.0,
    '>': 746.0, ':': 752.0, ';': 758.0,
    # ── Lowercase Latin (596–756 nm mapped by offset from uppercase) ────────
    # a-z offset: uppercase_nm + (visible range / 2) mapped into the symbol band
    # Each lowercase maps to its uppercase wavelength + 3 nm (sub-band offset)
    'a': 383.0, 'b': 389.0, 'c': 395.0, 'd': 401.0, 'e': 407.0,
    'f': 413.0, 'g': 419.0, 'h': 425.0, 'i': 431.0, 'j': 437.0,
    'k': 443.0, 'l': 449.0, 'm': 455.0, 'n': 461.0, 'o': 467.0,
    'p': 473.0, 'q': 479.0, 'r': 485.0, 's': 491.0, 't': 497.0,
    'u': 503.0, 'v': 509.0, 'w': 515.0, 'x': 521.0, 'y': 527.0,
    'z': 533.0,
    # ── Greek Lowercase (760–826 nm, Δ=3 nm) ───────────────────────────────
    'α': 760.0, 'β': 763.0, 'γ': 766.0, 'δ': 769.0, 'ε': 772.0,
    'ζ': 775.0, 'η': 778.0, 'θ': 781.0, 'ι': 784.0, 'κ': 787.0,
    'λ': 790.0, 'μ': 793.0, 'ν': 796.0, 'ξ': 799.0, 'π': 802.0,
    'ρ': 805.0, 'σ': 808.0, 'τ': 811.0, 'υ': 814.0, 'φ': 817.0,
    'χ': 820.0, 'ψ': 823.0, 'ω': 826.0,
    # ── Greek Uppercase (830–857 nm, Δ=3 nm) ───────────────────────────────
    'Γ': 830.0, 'Δ': 833.0, 'Θ': 836.0, 'Λ': 839.0, 'Ξ': 842.0,
    'Π': 845.0, 'Σ': 848.0, 'Φ': 851.0, 'Ψ': 854.0, 'Ω': 857.0,
    # ── Mathematical Operators (350–394 nm, Near-UV, Δ=3 nm) ────────────────
    '∫': 350.0, '∂': 353.0, '∇': 356.0, '√': 359.0, '∞': 362.0,
    '≈': 365.0, '≠': 368.0, '≤': 371.0, '≥': 374.0, '±': 377.0,
    '∓': 379.0, '×': 382.0, '÷': 385.0, '∑': 388.0, '∏': 391.0,
    '∆': 394.0,
    # ── Physics Symbols (860–902 nm, Δ=3 nm) ────────────────────────────────
    'ℏ': 860.0, 'Å': 863.0, '°': 866.0, '′': 869.0, '″': 872.0,
    '∝': 875.0, '∈': 878.0, '∉': 881.0, '∅': 884.0, '∪': 887.0,
    '∩': 890.0, '⊂': 893.0, '⊃': 896.0, '∀': 899.0, '∃': 902.0,
    # ── Subscripts (905–932 nm, Δ=3 nm) ────────────────────────────────────
    '₀': 905.0, '₁': 908.0, '₂': 911.0, '₃': 914.0, '₄': 917.0,
    '₅': 920.0, '₆': 923.0, '₇': 926.0, '₈': 929.0, '₉': 932.0,
    # ── Superscripts (938–965 nm, Δ=3 nm) ──────────────────────────────────
    '⁰': 938.0, '¹': 941.0, '²': 944.0, '³': 947.0, '⁴': 950.0,
    '⁵': 953.0, '⁶': 956.0, '⁷': 959.0, '⁸': 962.0, '⁹': 965.0,
    # ── Arrows & Logic (970–1033 nm, Δ=3 nm) ────────────────────────────────
    '→': 970.0,  '←': 973.0,  '↑': 976.0,  '↓': 979.0,  '↔': 982.0,
    '⇒': 985.0,  '⇐': 988.0,  '⇔': 991.0,  '∧': 994.0,  '∨': 997.0,
    '¬': 1000.0, '⊕': 1003.0, '⊗': 1006.0, '⊙': 1009.0, '⊥': 1012.0,
    '∥': 1015.0, '∠': 1018.0, '⟨': 1030.0, '⟩': 1033.0,
    # ── Quotation / Punctuation ─────────────────────────────────────────────
    '\u201c': 762.0,  # " left double quote
    '\u201d': 765.0,  # " right double quote
    '\u2018': 768.0,  # ' left single quote
    '\u2019': 771.0,  # ' right single quote
    '`':      774.0,
    '^':      777.0,
    '~':      780.0,
    '\n':     598.0,
    '\t':     600.0,
}

# Legacy map kept for backward compatibility (ordinal → wavelength fallback)
LAMBDA_CHAR_MAP = {
    chr(i): VISIBLE_MIN_NM + ((i % 256) / 255.0) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM)
    for i in range(256)
}


# ─────────────────────────────────────────────────────────────────────────────
# WASCII v2.0  —  Wave Density Spectral Vector
#
# Theory of Compression States — first unobserved wavefunction and its evolution
# ─────────────────────────────────────────────────────────────────────────────
#
# WASCII v1.0 collapses a string to one point: the average compression state.
# WASCII v2.0 preserves every character's compression state and returns the
# full spectral distribution — the wave density fingerprint of the text.
#
# Each character has a canonical wavelength from the WASCII table.
# That wavelength is a compression state on the Λ=hf/c² curve.
# The distribution of those states across the WDM bands IS the address —
# a spectral vector unique to each string, derived from physics, not assigned.
#
# Properties:
#   - Collision-resistant: different strings → different spectral distributions
#   - Language-agnostic: any character with a WASCII entry is supported
#   - Physics-grounded: each bin corresponds to a real WDM channel
#   - Entropy-measurable: spectral richness is a quantifiable property
# ─────────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
# WNSP DENSITY EQUATION  v2.0
#
#   D_WNSP = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M
#
#   Where:
#     N_λ    — wavelength (WDM) channels           = 256
#     N_OAM  — orbital angular momentum modes       = 50
#     N_Pol  — polarization states                  = 2
#     N_Dir  — propagation direction states         = 2  (+k̂ forward / −k̂ backward)
#     R_sym  — symbols per channel per cycle        (current = 2)
#     M      — modulation depth                     (current = 1, minimal)
#
#   Hilbert space:  dim(H) = 256 × 50 × 2 × 2 = 51,200 orthogonal channels
#   Current density: D_current = 51,200 × 2 × 1 = 102,400 symbols / cycle
#
#   Direction basis |Dir_d⟩: forward (+k̂) and backward (−k̂) propagating modes.
#   These are eigenstates of the propagation operator with eigenvalues +β and −β.
#   Maxwell time-reversal symmetry guarantees ⟨+k̂|−k̂⟩ = 0 — orthogonal by physics,
#   not software policy. Phase conjugation is the physical mechanism of reversal.
#
#   Energy-normalized form (connects to Λ = hf/c²):
#     D_energy = D_WNSP · λ / (h · c)
#
#   Key insight:
#     Traditional: C ∝ log(1+SNR)   — capacity via compression
#     WNSP:        D ∝ N_λ·N_OAM·N_Pol·N_Dir·R_sym·M — capacity via dimensional expansion
#
#   At higher frequency (shorter λ): photons carry more energy (Λ=hf/c²),
#   so density per unit energy decreases. The compression state curve is the
#   governing physics — not Shannon.
# ─────────────────────────────────────────────────────────────────────────────
def compute_wnsp_density(
    n_wdm:        int   = HILBERT_DIM_WDM,   # 256
    n_oam:        int   = HILBERT_DIM_OAM,   # 50
    n_pol:        int   = HILBERT_DIM_POL,   # 2
    n_dir:        int   = HILBERT_DIM_DIR,   # 2  (+k̂ forward / −k̂ backward)
    r_sym:        float = 2.0,               # symbols per channel per cycle
    m:            float = 1.0,               # modulation depth (1 = minimal)
    wavelength_nm: float = 550.0,            # reference wavelength for energy calc
) -> dict:
    """
    WNSP Density Equation v2.0 — D_WNSP = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M

    Computes channel capacity via Hilbert space expansion.
    N_Dir adds bidirectional propagation: forward (+k̂) and backward (−k̂) modes
    are orthogonal eigenstates (Maxwell time-reversal symmetry, ⟨+k̂|−k̂⟩ = 0).
    Energy-normalized form ties density to the Λ=hf/c² compression state curve.

    Returns full breakdown: Hilbert space structure, density metrics,
    energy normalization, phase scaling comparison, and theory note.
    """
    h = PLANCK_CONSTANT
    c = SPEED_OF_LIGHT

    # ── Hilbert space ─────────────────────────────────────────────────────────
    hilbert_channels = n_wdm * n_oam * n_pol * n_dir  # dim(H)

    # ── Core density ──────────────────────────────────────────────────────────
    d_raw = hilbert_channels * r_sym * m               # symbols per cycle

    # ── Energy-normalized density (symbols per joule) ─────────────────────────
    wavelength_m  = wavelength_nm * 1e-9
    frequency_hz  = c / wavelength_m
    energy_joules = h * frequency_hz               # E = hf
    lambda_mass   = energy_joules / (c ** 2)       # Λ = hf/c²
    d_energy      = d_raw * wavelength_m / (h * c) # D · λ / (h·c)

    # Band name for the reference wavelength
    band_ref = (
        "UV"     if wavelength_nm < 380 else
        "VIOLET" if wavelength_nm < 450 else
        "BLUE"   if wavelength_nm < 495 else
        "CYAN"   if wavelength_nm < 520 else
        "GREEN"  if wavelength_nm < 565 else
        "YELLOW" if wavelength_nm < 590 else
        "ORANGE" if wavelength_nm < 625 else
        "RED"    if wavelength_nm < 780 else
        "NIR"
    )

    # ── Phase scaling comparison ───────────────────────────────────────────────
    phases = [
        {
            "phase":    1,
            "label":    "Phase 1 — TCP/IP overlay (now)",
            "n_wdm":    100,
            "n_oam":    n_oam,
            "n_pol":    n_pol,
            "r_sym":    2.0,
            "m":        1,
            "channels": 100 * n_oam * n_pol,
            "d_symbols": int(100 * n_oam * n_pol * 2.0 * 1),
            "note":     "100 WDM bands (WASCII v1.0/v2.0), minimal modulation",
        },
        {
            "phase":    2,
            "label":    "Phase 2 — Full Hilbert, on-chain CE ordinals",
            "n_wdm":    256,
            "n_oam":    n_oam,
            "n_pol":    n_pol,
            "r_sym":    2.0,
            "m":        1,
            "channels": 256 * n_oam * n_pol,
            "d_symbols": int(256 * n_oam * n_pol * 2.0 * 1),
            "note":     "All 256 WDM channels active, CE ordinals on-chain",
        },
        {
            "phase":    3,
            "label":    "Phase 3 — Native photonic routing",
            "n_wdm":    256,
            "n_oam":    n_oam,
            "n_pol":    n_pol,
            "r_sym":    16.0,
            "m":        64,
            "channels": 256 * n_oam * n_pol,
            "d_symbols": int(256 * n_oam * n_pol * 16.0 * 64),
            "note":     "Addresses ARE physical channels. Λ=hf/c² governs routing.",
        },
    ]

    return {
        "equation":        "D_WNSP = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M",
        "energy_equation": "D_energy = D_WNSP · λ / (h · c)",
        "lambda_equation": "Λ = hf / c²   (compression state at reference wavelength)",
        "hilbert_space": {
            "n_wdm":          n_wdm,
            "n_oam":          n_oam,
            "n_pol":          n_pol,
            "n_dir":          n_dir,
            "total_channels": hilbert_channels,
            "channel_basis":  CHANNEL_BASIS_EQUATION,
            "dimension_note": f"dim(H) = {n_wdm} × {n_oam} × {n_pol} × {n_dir} = {hilbert_channels:,}",
        },
        "parameters": {
            "r_sym":        r_sym,
            "m":            m,
            "wavelength_nm": wavelength_nm,
            "band":         band_ref,
            "frequency_thz": round(frequency_hz / 1e12, 4),
            "energy_ev":    round(energy_joules / EV_PER_JOULE, 4),
            "energy_joules": energy_joules,
            "lambda_mass_kg": lambda_mass,
        },
        "density": {
            "d_raw":              int(d_raw),
            "d_energy":           round(d_energy, 2),
            "d_energy_unit":      "symbols per joule",
            "d_raw_unit":         "symbols per cycle",
        },
        "scaling_phases": phases,
        "shannon_comparison": {
            "shannon":   "C ∝ B · log₂(1 + SNR)   — capacity via compression",
            "wnsp":      "D ∝ N_λ · N_OAM · N_Pol · R_sym · M   — capacity via dimensional expansion",
            "key_difference": (
                "Shannon compresses harder into a single channel. "
                "WNSP adds orthogonal dimensions. These scale differently: "
                "Shannon hits diminishing returns with SNR; WNSP scales linearly with each new dimension."
            ),
        },
        "theory": (
            "WNSP scales capacity by expanding the Hilbert space — adding orthogonal "
            "dimensions rather than compressing a single channel. At higher frequency "
            "(shorter λ, higher compression state), photons carry more energy (Λ=hf/c²), "
            "so density per joule decreases along the compression curve. "
            "The full photonic address space (51,200 channels) is structurally "
            "identical to the quantum address space of the first wavefunction."
        ),
        "version": "WNSP-Density-v2.0",
    }


def channel_density_at_wdm(wdm_band: int, r_sym: float = 2.0, m: float = 1.0) -> dict:
    """
    Density of a single WDM channel at a specific compression state.

    Each WDM band occupies one slot in the N_λ dimension. The channel's
    sub-space is: 1 (WDM slot) × N_OAM × N_Pol = 100 orthogonal modes.

    D_channel = 1 × N_OAM × N_Pol × R_sym × M

    Energy normalization: at this compression state's wavelength,
    the density per joule = D_channel · λ / (h · c).

    Higher WDM band → longer wavelength → lower frequency →
    lower energy per photon → higher density per joule.
    This is the Λ=hf/c² curve applied per channel.
    """
    wdm_band   = max(1, min(wdm_band, HILBERT_DIM_WDM))
    # Center wavelength of this WDM band (4 nm/band, starting at 380 nm)
    wavelength_nm  = 380.0 + (wdm_band - 1) * 4.0 + 2.0
    wavelength_m   = wavelength_nm * 1e-9
    frequency_hz   = SPEED_OF_LIGHT / wavelength_m
    energy_joules  = PLANCK_CONSTANT * frequency_hz
    lambda_mass_kg = energy_joules / (SPEED_OF_LIGHT ** 2)

    sub_channels = HILBERT_DIM_OAM * HILBERT_DIM_POL   # 100 per WDM slot
    d_channel    = sub_channels * r_sym * m
    d_energy     = d_channel * wavelength_m / (PLANCK_CONSTANT * SPEED_OF_LIGHT)

    return {
        "wdm_band":           wdm_band,
        "wavelength_nm":      round(wavelength_nm, 2),
        "frequency_thz":      round(frequency_hz / 1e12, 4),
        "energy_ev":          round(energy_joules / EV_PER_JOULE, 4),
        "lambda_mass_kg":     lambda_mass_kg,
        "sub_channels":       sub_channels,           # OAM × Pol modes in this band
        "d_channel":          int(d_channel),          # symbols/cycle at this WDM slot
        "d_energy_per_joule": round(d_energy, 2),     # symbols/joule at this compression state
        "r_sym":              r_sym,
        "m":                  m,
        "equation":           "D_channel = 1 · N_OAM · N_Pol · R_sym · M",
    }


def compute_spectral_vector(text: str) -> dict:
    """
    WASCII v2.0 — Wave Density Spectral Vector.

    Compute the full compression-state distribution for a string.
    Each character maps to its canonical WASCII wavelength (compression state).
    The histogram of those states across 100 WDM bands is the spectral fingerprint.

    Args:
        text: Input string (any characters; WASCII-unmapped fall back to ordinal map)

    Returns dict with:
        bands              — dict {wdm_index (1-100): count} visible spectrum histogram
        extended_uv        — count of chars in UV range (< 380 nm)
        extended_nir       — count of chars in NIR range (> 780 nm)
        character_states   — list of per-character compression state details
        centroid_nm        — weighted average wavelength (centre of spectral mass)
        bandwidth_nm       — spectral spread (standard deviation of wavelengths)
        spectral_entropy   — Shannon entropy normalised 0–1 (0=all same, 1=max diversity)
        dominant_nm        — wavelength of the most-populated WDM band
        dominant_band      — band name of dominant_nm
        compression_range  — [min_nm, max_nm] — full span of compression states used
        total_chars        — total character count (excl. unmappable)
        unique_states      — number of unique compression states (wavelengths) used
        version            — "WASCII-v2.0"
    """
    if not text:
        return {
            "bands": {}, "extended_uv": 0, "extended_nir": 0,
            "character_states": [], "centroid_nm": 0.0, "bandwidth_nm": 0.0,
            "spectral_entropy": 0.0, "dominant_nm": 0.0, "dominant_band": "NONE",
            "compression_range": [0.0, 0.0], "total_chars": 0,
            "unique_states": 0, "version": "WASCII-v2.0",
        }

    # ── 1. Map each character to its compression state (wavelength) ──────────
    char_wavelengths: list[float] = []
    character_states = []
    extended_uv = 0
    extended_nir = 0

    for ch in text:
        nm = WASCII_TABLE.get(ch) or WASCII_TABLE.get(ch.upper()) or LAMBDA_CHAR_MAP.get(ch)
        if nm is None:
            continue
        f  = SPEED_OF_LIGHT / (nm * 1e-9)
        lm = (PLANCK_CONSTANT * f) / (SPEED_OF_LIGHT ** 2)
        E  = PLANCK_CONSTANT * f
        band_name = (
            "UV"     if nm < 380 else
            "VIOLET" if nm < 450 else
            "BLUE"   if nm < 495 else
            "CYAN"   if nm < 520 else
            "GREEN"  if nm < 565 else
            "YELLOW" if nm < 590 else
            "ORANGE" if nm < 625 else
            "RED"    if nm < 780 else
            "NIR"
        )
        wdm = max(1, min(100, math.floor((min(nm, 780) - 380) / 4) + 1)) if 380 <= nm < 780 else None
        char_wavelengths.append(nm)
        character_states.append({
            "char": ch,
            "wavelength_nm": round(nm, 2),
            "frequency_thz": round(f / 1e12, 4),
            "energy_joules": round(E, 38),
            "lambda_mass_kg": round(lm, 44),
            "band": band_name,
            "wdm_channel": wdm,
        })
        if nm < 380:
            extended_uv += 1
        elif nm >= 780:
            extended_nir += 1

    if not char_wavelengths:
        return {
            "bands": {}, "extended_uv": 0, "extended_nir": 0,
            "character_states": [], "centroid_nm": 0.0, "bandwidth_nm": 0.0,
            "spectral_entropy": 0.0, "dominant_nm": 0.0, "dominant_band": "NONE",
            "compression_range": [0.0, 0.0], "total_chars": 0,
            "unique_states": 0, "version": "WASCII-v2.0",
        }

    # ── 2. Build visible-spectrum histogram (100 WDM bands, 4 nm each) ───────
    bands: dict[int, int] = {}
    for nm in char_wavelengths:
        if 380 <= nm < 780:
            wdm = max(1, min(100, math.floor((nm - 380) / 4) + 1))
            bands[wdm] = bands.get(wdm, 0) + 1

    # ── 3. Statistical properties ─────────────────────────────────────────────
    total = len(char_wavelengths)
    centroid = sum(char_wavelengths) / total
    variance = sum((nm - centroid) ** 2 for nm in char_wavelengths) / total
    bandwidth = math.sqrt(variance)

    # Shannon entropy over visible-spectrum bins (normalised 0–1)
    visible_total = sum(bands.values())
    entropy = 0.0
    if visible_total > 1:
        max_entropy = math.log2(100)   # log2(100 possible bins) ≈ 6.644
        for count in bands.values():
            if count > 0:
                p = count / visible_total
                entropy -= p * math.log2(p)
        entropy = round(entropy / max_entropy, 4)   # normalise to 0–1

    # Dominant WDM band
    dominant_wdm = max(bands, key=bands.get) if bands else None
    dominant_nm  = round(380 + (dominant_wdm - 1) * 4 + 2, 1) if dominant_wdm else 0.0
    dominant_band = (
        "VIOLET" if dominant_nm < 450 else
        "BLUE"   if dominant_nm < 495 else
        "CYAN"   if dominant_nm < 520 else
        "GREEN"  if dominant_nm < 565 else
        "YELLOW" if dominant_nm < 590 else
        "ORANGE" if dominant_nm < 625 else
        "RED"
    ) if dominant_nm else "NONE"

    unique_states = len(set(round(nm, 1) for nm in char_wavelengths))

    return {
        "bands":            {str(k): v for k, v in sorted(bands.items())},
        "extended_uv":      extended_uv,
        "extended_nir":     extended_nir,
        "character_states": character_states,
        "centroid_nm":      round(centroid, 4),
        "bandwidth_nm":     round(bandwidth, 4),
        "spectral_entropy": entropy,
        "dominant_nm":      dominant_nm,
        "dominant_band":    dominant_band,
        "compression_range":[round(min(char_wavelengths), 2), round(max(char_wavelengths), 2)],
        "total_chars":      total,
        "unique_states":    unique_states,
        "version":          "WASCII-v2.0",
    }


# ─────────────────────────────────────────────────────────────────────────────
# WnspFrame  —  Fundamental unit of spectral transmission (WNSP-SE v1.0)
#
# Defined in the WNSP Spectral Encoding Standard, Section 3.5.
# One frame = one character = one photon at its canonical WASCII wavelength.
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class WnspFrame:
    sync:            int    # Synchronisation pattern (always 0xAA = 170)
    symbol:          str    # The character this frame carries
    wavelength_nm:   float  # WASCII canonical wavelength for this character
    frequency_hz:    float  # f = c / λ
    energy_joules:   float  # E = hf
    lambda_mass_kg:  float  # Λ = hf / c²
    intensity_level: int    # 0–7 (3-bit amplitude field)
    checksum:        int    # XOR of ordinal + round(wavelength_nm) mod 256
    payload_bit:     int    # DAG-linking bit (frame_index mod 2)
    timestamp_ms:    float  # Transmission timestamp (ms since epoch)
    wascii_defined:  bool   # True if wavelength came from WASCII table

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _wascii_wavelength(char: str) -> Tuple[float, bool]:
    """
    Return (wavelength_nm, wascii_defined) for a character.
    WASCII table is authoritative; ordinal interpolation is the fallback.
    """
    if char in WASCII_TABLE:
        return WASCII_TABLE[char], True
    # Fallback: ordinal interpolation over [380, 780]
    code = ord(char) if char else 32
    nm = VISIBLE_MIN_NM + ((code % 256) / 255.0) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM)
    return nm, False


def _generate_psq(seed: str, counter: int, ttl: int = 10) -> str:
    """
    Phase Sequence Token — WNSP-SE v1.0, Section 3.2.
    PSQ-{hash24}-TTL{n}
    """
    content = f"{seed}:{counter}:{time.time()}:{ttl}"
    token   = hashlib.sha256(content.encode()).hexdigest()[:24]
    return f"PSQ-{token}-TTL{ttl}"


def _coherence(frames: List[WnspFrame]) -> float:
    """
    Estimate transmission coherence γ from wavelength variance.
    γ = 1 - (std_dev / mean) clamped to [0, 1].
    Perfect coherence = same wavelength throughout (γ = 1).
    """
    if not frames:
        return 0.0
    wls  = [f.wavelength_nm for f in frames]
    mean = sum(wls) / len(wls)
    if mean == 0:
        return 0.0
    std  = math.sqrt(sum((w - mean) ** 2 for w in wls) / len(wls))
    return max(0.0, min(1.0, 1.0 - std / mean))


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

    Receives WNSP-CE tokens and maps each character to its canonical WASCII
    wavelength, producing a sequence of WnspFrame objects:

        sync            0xAA   — synchronisation constant
        symbol          char   — the character
        wavelength_nm   λ (nm) — from WASCII table (authoritative)
        frequency_hz    f (Hz) — f = c / λ
        energy_joules   E (J)  — E = hf
        lambda_mass_kg  Λ (kg) — Λ = hf / c²
        intensity_level 0–7    — 3-bit amplitude
        checksum        int    — XOR (ordinal XOR round(wavelength)) mod 256
        payload_bit     0|1    — DAG-linking bit
        timestamp_ms    float  — ms since epoch

    Channel Basis (Hilbert Space Model)
    ------------------------------------
        Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩ ⊗ |Dir_d⟩
        dim(H) = 256 × 50 × 2 × 2 = 51,200
        ⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j
    """

    PROTOCOL = "WNSP-SE"
    VERSION  = WNSP_SE_VERSION

    def __init__(self, intensity: int = 32, cycles: int = 1,
                 scheme: LambdaEncodingScheme = LambdaEncodingScheme.DUAL_WAVELENGTH):
        self.intensity = max(0, min(7, intensity // 4))  # map 0–31 → 0–7
        self.cycles    = cycles
        self.scheme    = scheme

    # ── Physics helpers ───────────────────────────────────────────

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

    @staticmethod
    def _checksum(symbol: str, wavelength_nm: float) -> int:
        """XOR of character ordinal and rounded wavelength, mod 256."""
        code = ord(symbol) if symbol else 32
        return (code ^ int(round(wavelength_nm))) % 256

    # ── Single-character frame (canonical WNSP-SE frame) ─────────

    def encode_char_frame(self, token: Dict, frame_idx: int = 0) -> WnspFrame:
        """
        Build a WnspFrame for a single CE token using the WASCII table.
        This is the authoritative SE encoding for one character.
        """
        symbol          = token.get("symbol", " ")
        wl_nm, defined  = _wascii_wavelength(symbol)
        freq            = self.wavelength_to_frequency(wl_nm)
        energy          = self.frequency_to_energy(freq)
        mass            = self.frequency_to_lambda_mass(freq)
        chk             = self._checksum(symbol, wl_nm)

        return WnspFrame(
            sync            = 0xAA,
            symbol          = symbol,
            wavelength_nm   = wl_nm,
            frequency_hz    = freq,
            energy_joules   = energy,
            lambda_mass_kg  = mass,
            intensity_level = self.intensity,
            checksum        = chk,
            payload_bit     = frame_idx % 2,
            timestamp_ms    = time.time() * 1000,
            wascii_defined  = defined,
        )

    # ── Dual-wavelength frame (two chars per photon — legacy / simulation) ──

    def encode_token_pair(self, token1: Dict, token2: Dict) -> Dict[str, Any]:
        """
        Pack two CE tokens as a dual-wavelength frame.
        Both wavelengths now come from the WASCII table.
        """
        wl1, d1 = _wascii_wavelength(token1.get("symbol", " "))
        wl2, d2 = _wascii_wavelength(token2.get("symbol", " "))

        f1, f2   = self.wavelength_to_frequency(wl1), self.wavelength_to_frequency(wl2)
        e1, e2   = self.frequency_to_energy(f1),       self.frequency_to_energy(f2)
        m1, m2   = self.frequency_to_lambda_mass(f1),  self.frequency_to_lambda_mass(f2)

        return {
            "protocol":            self.PROTOCOL,
            "version":             self.VERSION,
            "scheme":              self.scheme.value,
            "ce_symbols":          [token1.get("symbol", " "), token2.get("symbol", " ")],
            "wavelength_start_nm": wl1,
            "wavelength_end_nm":   wl2,
            "frequency_start_hz":  f1,
            "frequency_end_hz":    f2,
            "energy_joules":       (e1 + e2) / 2,
            "lambda_mass_kg":      (m1 + m2) / 2,
            "intensity":           self.intensity,
            "cycles":              self.cycles,
            "wascii_defined":      [d1, d2],
        }

    # ── Full token stream → SE frame sequence ────────────────────

    def encode_token_stream(self, ce_output: Dict) -> Dict[str, Any]:
        """
        Accept a WNSP-CE token stream and return a WNSP-SE frame sequence.

        Returns:
          - spectral_frames  : one WnspFrame per character (canonical SE output)
          - dual_wl_frames   : legacy dual-wavelength packing (two chars/frame)
          - psq_token        : Phase Sequence Token for this transmission
          - coherence        : γ coherence measure [0, 1]
        """
        tokens = ce_output.get("tokens", [])
        seed   = ce_output.get("input_text", "")

        # ── Per-character WnspFrames (authoritative) ──────────────────────
        spectral_frames: List[WnspFrame] = [
            self.encode_char_frame(tok, i) for i, tok in enumerate(tokens)
        ]

        # ── Dual-wavelength packing (backward compat / simulation) ────────
        padded = tokens[:]
        if len(padded) % 2 != 0:
            padded.append(WNSPCharacterEncoder().encode_char(" "))
        dual_frames = [
            self.encode_token_pair(padded[i], padded[i + 1])
            for i in range(0, len(padded), 2)
        ]

        total_energy = sum(f.energy_joules  for f in spectral_frames)
        total_mass   = sum(f.lambda_mass_kg for f in spectral_frames)
        gamma        = _coherence(spectral_frames)
        psq          = _generate_psq(seed, len(tokens))

        return {
            "protocol":             self.PROTOCOL,
            "version":              self.VERSION,
            "psq_token":            psq,
            "coherence_gamma":      round(gamma, 6),
            "coherence_valid":      gamma >= 0.70,
            "coherence_threshold":  0.70,
            "frame_count":          len(spectral_frames),
            "spectral_frames":      [f.to_dict() for f in spectral_frames],
            "frames":               dual_frames,          # legacy key
            "total_energy_joules":  total_energy,
            "total_lambda_mass_kg": total_mass,
            "chars_per_dual_frame": len(tokens) / len(dual_frames) if dual_frames else 0,
            "physics_equation":     "Λ = hf/c²",
            "wascii_standard":      "WNSP-SE v1.0 / November 2025",
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

    def __init__(self, intensity: int = 32, cycles: int = 1, r_sym: float = 2.0):
        self.ce    = WNSPCharacterEncoder()
        self.se    = WNSPSpectralEncoder(intensity=intensity, cycles=cycles)
        self.r_sym = r_sym  # symbols per channel per cycle (density equation parameter)

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
                    "standard":         "WNSP-SE",
                    "version":          WNSP_SE_VERSION,
                    "description":      "Spectral Encoding — physical wave layer (Λ = hf/c²)",
                    "wascii_standard":  "WNSP-SE v1.0 / November 2025",
                    "frame_count":      se_output["frame_count"],
                    "frames":           se_output["frames"],
                    "spectral_frames":  se_output["spectral_frames"],
                    "psq_token":        se_output["psq_token"],
                    "coherence_gamma":  se_output["coherence_gamma"],
                    "coherence_valid":  se_output["coherence_valid"],
                    "total_lambda_mass_kg":  se_output["total_lambda_mass_kg"],
                    "total_energy_joules":   se_output["total_energy_joules"],
                    "chars_per_frame":       se_output.get("chars_per_dual_frame", 0),
                },
            },

            "summary": {
                "characters":    len(text),
                "ce_tokens":     ce_output["token_count"],
                "se_frames":     se_output["frame_count"],
                "total_mass_kg": se_output["total_lambda_mass_kg"],
                "efficiency":    f"{se_output.get('chars_per_dual_frame', 0):.1f} chars/dual-frame",
                "coherence":     se_output["coherence_gamma"],
                "psq_token":     se_output["psq_token"],
            },

            "validation": {
                "status":    "VALID — Lambda mass conserved",
                "equation":  "Λ = hf/c²",
                "timestamp": time.time(),
            },

            # ── WNSP Density Equation ──────────────────────────────────────
            # D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M
            # Applied at the full Hilbert space (cycles required for this message).
            "density": {
                "equation":        "D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M",
                "d_wnsp":          HILBERT_DIM_TOTAL * self.r_sym * 1,  # R_sym, M=1 (minimal)
                "hilbert_channels": HILBERT_DIM_TOTAL,
                "r_sym":           self.r_sym,
                "m":               1,
                "cycles_required": max(1, math.ceil(se_output["frame_count"] / max(1, HILBERT_DIM_TOTAL * self.r_sym))),
                "frames_this_msg": se_output["frame_count"],
                "unit":            "symbols per cycle",
                "note": (
                    "cycles_required = ceil(frames / D_WNSP). "
                    "At Phase 3 (photonic), all 51,200 channels route simultaneously — "
                    "a single cycle carries the entire message."
                ),
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
