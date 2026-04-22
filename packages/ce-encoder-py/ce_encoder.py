# CE Encoder — WNSP Character Encoding v1.0
# AGPL-3.0 — NexusOS Free Infrastructure
# E = hf  |  λ = c/f  |  Λ = hf/c²
# Runs on any silicon chip today. No server required.
# Canonical implementation — bit-identical to nexusos-ce-encoder npm package.

from __future__ import annotations

H: float = 6.626e-34   # J·s  (Planck constant)
C: float = 2.998e8     # m/s  (speed of light)

# CE 128-band lookup table: ASCII code 0-127 → wavelength 380-780 nm
# 128 entries, 3.125 nm per band, deterministic and silicon-ready.
CE_TABLE: list[float] = [380 + (i / 128) * 400 for i in range(128)]

BANDS: list[tuple[str, float, float]] = [
    ("SYSTEM",  380, 450),
    ("AUTH",    450, 490),
    ("STREAM",  490, 520),
    ("CORE",    520, 565),
    ("UI",      565, 590),
    ("EVENT",   590, 625),
    ("STORAGE", 625, 780),
]


def char_to_nm(char: str) -> float:
    """Map a single character to its CE wavelength (nm)."""
    return CE_TABLE[ord(char) % 128]


def get_band(nm: float) -> str:
    """Map a wavelength to its spectral authority band name."""
    for name, lo, hi in BANDS:
        if lo <= nm < hi:
            return name
    return "STORAGE"


def get_psi(nm: float, text: str) -> str:
    """Derive the Ψ(wdm,oam,pol) Hilbert-space channel address."""
    wdm = int((nm - 380) / 4) + 1
    oam = sum(ord(c) for c in text) % 50
    pol = "H" if len(text) % 2 == 0 else "V"
    return f"Ψ({wdm},{oam},{pol})"


def ceEncode(text: str) -> dict | None:
    """CE-encode text to a spectral address.

    Returns a dict with keys:
        wavelength  — dominant wavelength in nm (float, 2 dp)
        band        — spectral authority band name (str)
        psiChannel  — Ψ(wdm,oam,pol) Hilbert-space channel address (str)
        energy      — photon energy E=hf in joules (float)

    Bit-identical to the nexusos-ce-encoder npm package for the same input.
    """
    if not text:
        return None
    nms        = [char_to_nm(c) for c in text]
    wavelength = round(sum(nms) / len(nms), 2)
    f          = C / (wavelength * 1e-9)   # f = c/λ
    energy     = H * f                     # E = hf
    return {
        "wavelength":  wavelength,
        "band":        get_band(wavelength),
        "psiChannel":  get_psi(wavelength, text),
        "energy":      energy,
    }


__all__ = ["ceEncode", "char_to_nm", "get_band", "get_psi", "CE_TABLE", "BANDS"]
