"""
WNSP Kernel Authority Layer
===========================

Maps each Ψ_channel to an authority band based on its WDM index.
Controls which agents may write to which channels.

Authority Bands
---------------
  SYSTEM  — WDM 0–63    (violet/UV)  Core OS processes only
  KERNEL  — WDM 64–127  (blue)       Kernel-level daemons
  USER    — WDM 128–191 (green/red)  User-space AI agents
  GUEST   — WDM 192–255 (near-IR)    External / untrusted agents

Rules
-----
  A message is permitted when:
    sender authority rank  ≤  receiver authority rank

  i.e. SYSTEM can write everywhere; GUEST can only write to GUEST channels.

Author: Te Rata Pou
License: AGPL-3.0
"""

from enum import IntEnum
from typing import Optional


class AuthorityBand(IntEnum):
    SYSTEM = 0   # highest authority
    KERNEL = 1
    USER   = 2
    GUEST  = 3   # lowest authority


# WDM index → authority band
_WDM_RANGES = [
    (0,   63,  AuthorityBand.SYSTEM),
    (64,  127, AuthorityBand.KERNEL),
    (128, 191, AuthorityBand.USER),
    (192, 255, AuthorityBand.GUEST),
]

# Well-known core agent names always assigned SYSTEM or KERNEL band
_CORE_AGENTS = {
    "os_kernel":        AuthorityBand.SYSTEM,
    "bus_router":       AuthorityBand.SYSTEM,
    "scheduler_daemon": AuthorityBand.KERNEL,
    "watchdog_daemon":  AuthorityBand.KERNEL,
    "auth_gateway":     AuthorityBand.KERNEL,
}


def band_for_wdm(wdm: int) -> AuthorityBand:
    """Return the authority band for a WDM channel index."""
    for lo, hi, band in _WDM_RANGES:
        if lo <= wdm <= hi:
            return band
    return AuthorityBand.GUEST


def band_for_agent(agent_name: str, wdm: int) -> AuthorityBand:
    """
    Return the authority band for a named agent.
    Core agents always get their fixed band regardless of WDM index.
    """
    if agent_name in _CORE_AGENTS:
        return _CORE_AGENTS[agent_name]
    return band_for_wdm(wdm)


def is_permitted(
    src_band: AuthorityBand,
    dst_band: AuthorityBand,
) -> bool:
    """
    Returns True if src is allowed to write to dst's channel.

    Rule: sender must have authority ≤ receiver (i.e. equal or higher authority).
    This prevents GUEST agents from injecting into SYSTEM channels.
    """
    return src_band <= dst_band


def check_send_permission(
    src_agent: str, src_wdm: int,
    dst_agent: str, dst_wdm: int,
) -> tuple[bool, str]:
    """
    Returns (permitted: bool, reason: str).
    """
    src_band = band_for_agent(src_agent, src_wdm)
    dst_band = band_for_agent(dst_agent, dst_wdm)

    if is_permitted(src_band, dst_band):
        return True, f"{src_agent} [{src_band.name}] → {dst_agent} [{dst_band.name}] permitted"
    return False, (
        f"{src_agent} [{src_band.name}] lacks authority to write to "
        f"{dst_agent} [{dst_band.name}] channel"
    )


def band_name(wdm: int, agent_name: Optional[str] = None) -> str:
    """Return the string name of the authority band."""
    band = band_for_agent(agent_name, wdm) if agent_name else band_for_wdm(wdm)
    return band.name


def all_bands_summary() -> list:
    """Return a human-readable summary of all authority bands."""
    return [
        {
            "band":        "SYSTEM",
            "rank":        0,
            "wdm_range":   "0 – 63",
            "wavelength":  "380 – 479 nm (violet/UV)",
            "description": "Core OS processes — unrestricted access",
            "core_agents": [k for k, v in _CORE_AGENTS.items()
                            if v == AuthorityBand.SYSTEM],
        },
        {
            "band":        "KERNEL",
            "rank":        1,
            "wdm_range":   "64 – 127",
            "wavelength":  "480 – 559 nm (blue/cyan)",
            "description": "Kernel-level daemons — write to USER and GUEST",
            "core_agents": [k for k, v in _CORE_AGENTS.items()
                            if v == AuthorityBand.KERNEL],
        },
        {
            "band":        "USER",
            "rank":        2,
            "wdm_range":   "128 – 191",
            "wavelength":  "560 – 659 nm (green/yellow/orange)",
            "description": "User-space AI agents — write to USER and GUEST",
            "core_agents": [],
        },
        {
            "band":        "GUEST",
            "rank":        3,
            "wdm_range":   "192 – 255",
            "wavelength":  "660 – 780 nm (red/near-IR)",
            "description": "External/untrusted agents — write to GUEST only",
            "core_agents": [],
        },
    ]
