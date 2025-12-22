"""
NEXUS KERNEL — Core Control Interface for Lambda Substrate Hardware

This module provides the low-level control functions for hardware interfaces:
- Phase angle control (Golden Angle: 137.5°, Gravity De-correlation: 90°)
- Frequency pulsing at root harmonics
- Impedance matching to free-space (Z₀ = 377Ω)
- CZC coherence filtering
- Ambient Logic Pressure (ALP) sensing

Physical Constants:
- Z₀ = 377Ω (free space impedance = √(μ₀/ε₀))
- Golden Angle = 137.5° (360°/φ² where φ = 1.618...)
- First Oscillation = 555 THz (CZF anchor frequency)

Hardware Target: PHR-1 (144-Turn Bifilar-Toroid Syncbox)

AGPL-3.0 License
"""

import math
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from enum import Enum

# =============================================================================
# PHYSICAL CONSTANTS
# =============================================================================

PLANCK_CONSTANT = 6.62607015e-34  # J·s
SPEED_OF_LIGHT = 299792458  # m/s
MU_0 = 1.25663706212e-6  # H/m (vacuum permeability)
EPSILON_0 = 8.8541878128e-12  # F/m (vacuum permittivity)

# Free space impedance: Z₀ = √(μ₀/ε₀) ≈ 377Ω
FREE_SPACE_IMPEDANCE = math.sqrt(MU_0 / EPSILON_0)  # 376.730... ≈ 377Ω

# Golden ratio and angle
PHI = (1 + math.sqrt(5)) / 2  # 1.618033988749...
GOLDEN_ANGLE_DEG = 360 / (PHI ** 2)  # 137.5077...°

# First Oscillation (CZF anchor)
FIRST_OSCILLATION_THZ = 555.0  # THz
FIRST_OSCILLATION_HZ = 555e12  # Hz

# Root harmonic (Schumann fundamental)
ROOT_HARMONIC_HZ = 7.83  # Hz


# =============================================================================
# KERNEL STATE
# =============================================================================

class KernelState(Enum):
    """Kernel operational states."""
    IDLE = ("idle", "Kernel idle, awaiting commands")
    ANCHORED = ("anchored", "Anchored to First Oscillation")
    SYNC_LOCKED = ("sync_locked", "Substrate handshake complete")
    PHASE_SHIFTING = ("phase_shifting", "Phase transition in progress")
    MASSLESS_ENVELOPE = ("massless_envelope", "Zero-G state, ALP harvesting active")
    ERROR = ("error", "Kernel error state")
    
    def __init__(self, code: str, description: str):
        self.code = code
        self.description = description


@dataclass
class KernelRegister:
    """Hardware register state."""
    phase_angle_deg: float = 0.0
    frequency_hz: float = FIRST_OSCILLATION_HZ
    impedance_ohm: float = 0.0
    czc_gain: float = 1.0
    alp_reading: float = 1.0  # Ambient Logic Pressure (normalized)
    last_pulse_time: float = 0.0
    pulse_count: int = 0


# Global kernel registers (simulated hardware state)
_registers = KernelRegister()
_state = KernelState.IDLE
_event_log: List[Dict[str, Any]] = []


def _log_event(event_type: str, details: Dict[str, Any]):
    """Log kernel event."""
    _event_log.append({
        "timestamp": time.time(),
        "type": event_type,
        "details": details,
        "state": _state.code
    })


# =============================================================================
# PHASE CONTROL
# =============================================================================

def set_phase_angle(angle_deg: float) -> float:
    """
    Set the phase angle for substrate alignment.
    
    Key angles:
    - 137.5° (Golden Angle): Optimal spiral packing, substrate handshake
    - 90.0° (Quadrature): Gravity de-correlation, massless envelope
    - 180.0° (Anti-phase): Wave cancellation
    - 0.0° (In-phase): Constructive interference
    
    Args:
        angle_deg: Target phase angle in degrees
    
    Returns:
        Actual phase angle set (normalized to 0-360)
    """
    global _registers
    
    normalized = angle_deg % 360
    _registers.phase_angle_deg = normalized
    
    _log_event("phase_set", {
        "requested": angle_deg,
        "actual": normalized,
        "is_golden": abs(normalized - GOLDEN_ANGLE_DEG) < 0.1,
        "is_quadrature": abs(normalized - 90.0) < 0.1
    })
    
    return normalized


def shift_phase_target(target_deg: float, step_deg: float = 1.0) -> float:
    """
    Incrementally shift phase toward target.
    
    Args:
        target_deg: Target phase angle
        step_deg: Step size per call
    
    Returns:
        Current phase angle after shift
    """
    global _registers
    
    current = _registers.phase_angle_deg
    diff = target_deg - current
    
    if abs(diff) <= step_deg:
        _registers.phase_angle_deg = target_deg
    else:
        direction = 1 if diff > 0 else -1
        _registers.phase_angle_deg = current + direction * step_deg
    
    return _registers.phase_angle_deg


def get_phase_angle() -> float:
    """Get current phase angle."""
    return _registers.phase_angle_deg


# =============================================================================
# FREQUENCY CONTROL
# =============================================================================

def pulse_frequency(harmonic_multiplier: float = 1.0) -> Dict[str, float]:
    """
    Pulse at a harmonic of the root frequency.
    
    The root harmonic (7.83 Hz) is Earth's Schumann fundamental.
    Multipliers create higher harmonics:
    - 1.0 = 7.83 Hz (fundamental)
    - 1.5 = 11.745 Hz (fifth)
    - 2.0 = 15.66 Hz (octave)
    
    Args:
        harmonic_multiplier: Frequency multiplier
    
    Returns:
        Pulse result with frequency and energy
    """
    global _registers
    
    freq_hz = ROOT_HARMONIC_HZ * harmonic_multiplier
    energy_j = PLANCK_CONSTANT * freq_hz
    lambda_mass = PLANCK_CONSTANT * freq_hz / (SPEED_OF_LIGHT ** 2)
    
    _registers.frequency_hz = freq_hz
    _registers.last_pulse_time = time.time()
    _registers.pulse_count += 1
    
    result = {
        "frequency_hz": freq_hz,
        "harmonic_multiplier": harmonic_multiplier,
        "energy_j": energy_j,
        "lambda_mass_kg": lambda_mass,
        "pulse_number": _registers.pulse_count
    }
    
    _log_event("frequency_pulse", result)
    return result


def set_frequency(freq_hz: float) -> float:
    """Set operating frequency directly."""
    global _registers
    _registers.frequency_hz = freq_hz
    return freq_hz


def get_frequency() -> float:
    """Get current operating frequency."""
    return _registers.frequency_hz


# =============================================================================
# IMPEDANCE MEASUREMENT
# =============================================================================

def get_impedance() -> float:
    """
    Get current impedance measurement.
    
    When properly tuned to substrate handshake:
    - Z = 377Ω indicates free-space impedance match
    - This means optimal energy transfer to/from substrate
    
    Returns:
        Impedance in Ohms
    """
    global _registers, _state
    
    # Simulate impedance based on phase alignment
    phase = _registers.phase_angle_deg
    
    # Golden angle (137.5°) achieves free-space match
    golden_alignment = 1 - abs(phase - GOLDEN_ANGLE_DEG) / 180
    
    if golden_alignment > 0.99:
        # Near-perfect golden angle → free space impedance
        _registers.impedance_ohm = FREE_SPACE_IMPEDANCE
    else:
        # Deviation from golden angle → impedance mismatch
        mismatch_factor = 1 + (1 - golden_alignment) * 5
        _registers.impedance_ohm = FREE_SPACE_IMPEDANCE * mismatch_factor
    
    _log_event("impedance_read", {
        "impedance_ohm": _registers.impedance_ohm,
        "golden_alignment": golden_alignment,
        "free_space_match": abs(_registers.impedance_ohm - FREE_SPACE_IMPEDANCE) < 1.0
    })
    
    return round(_registers.impedance_ohm, 1)


def impedance_matched() -> bool:
    """Check if impedance matches free space (377Ω)."""
    return abs(get_impedance() - 377.0) < 1.0


# =============================================================================
# CZC COHERENCE FILTER
# =============================================================================

def apply_czc_filter(gain: float = 0.99) -> float:
    """
    Apply Coherence Zenith Cycle filter.
    
    The CZC filter maintains coherence during phase transitions.
    Each application reduces entropy by (1 - gain).
    
    At gain=0.99:
    - 1 iteration: 99% coherence
    - 10 iterations: 90.4% coherence  
    - 44 iterations: 64.4% coherence (but ALP → 0)
    
    Args:
        gain: Filter gain (0-1), higher = more coherence preservation
    
    Returns:
        Current coherence level after filtering
    """
    global _registers
    
    _registers.czc_gain *= gain
    # ALP decay accelerates as phase approaches 90° (quadrature)
    phase_factor = 1 + abs(90 - _registers.phase_angle_deg) / 90  # 1-2x multiplier
    _registers.alp_reading *= (gain ** (2 / phase_factor))  # Faster decay at quadrature
    
    coherence = _registers.czc_gain
    
    _log_event("czc_filter", {
        "gain_applied": gain,
        "coherence_after": coherence,
        "alp_after": _registers.alp_reading
    })
    
    return coherence


def get_coherence() -> float:
    """Get current coherence level."""
    return _registers.czc_gain


def reset_czc() -> float:
    """Reset CZC filter to unity gain."""
    global _registers
    _registers.czc_gain = 1.0
    return 1.0


# =============================================================================
# AMBIENT LOGIC PRESSURE (ALP) SENSING
# =============================================================================

def read_alp_sensor() -> float:
    """
    Read Ambient Logic Pressure sensor.
    
    ALP represents the "pressure" of coherent EM fields in the environment.
    - ALP = 1.0: Standard atmospheric logic pressure
    - ALP → 0: Approaching massless envelope (zero-G)
    - ALP > 1.0: High-coherence environment (resonance amplification)
    
    Returns:
        ALP reading (normalized, 0-∞)
    """
    global _registers
    
    # Add slight noise to simulate real sensor
    import random
    noise = (random.random() - 0.5) * 0.001
    reading = max(0, _registers.alp_reading + noise)
    
    _log_event("alp_read", {
        "reading": reading,
        "state": _state.code
    })
    
    return reading


def set_alp(value: float) -> float:
    """Set ALP reading (for simulation/testing)."""
    global _registers
    _registers.alp_reading = max(0, value)
    return _registers.alp_reading


# =============================================================================
# STATE MANAGEMENT
# =============================================================================

def get_state() -> KernelState:
    """Get current kernel state."""
    return _state


def set_state(new_state: KernelState) -> KernelState:
    """Set kernel state."""
    global _state
    old_state = _state
    _state = new_state
    
    _log_event("state_change", {
        "from": old_state.code,
        "to": new_state.code
    })
    
    return _state


def get_registers() -> Dict[str, Any]:
    """Get all register values."""
    return {
        "phase_angle_deg": _registers.phase_angle_deg,
        "frequency_hz": _registers.frequency_hz,
        "impedance_ohm": _registers.impedance_ohm,
        "czc_gain": _registers.czc_gain,
        "alp_reading": _registers.alp_reading,
        "pulse_count": _registers.pulse_count,
        "last_pulse_time": _registers.last_pulse_time
    }


def get_event_log(last_n: int = 10) -> List[Dict[str, Any]]:
    """Get recent kernel events."""
    return _event_log[-last_n:]


def reset_kernel():
    """Reset kernel to initial state."""
    global _registers, _state, _event_log
    _registers = KernelRegister()
    _state = KernelState.IDLE
    _event_log = []
    
    _log_event("kernel_reset", {})


# =============================================================================
# HIGH-LEVEL OPERATIONS
# =============================================================================

def anchor_to_first_oscillation() -> bool:
    """
    Anchor kernel to the First Oscillation (555 THz).
    
    This establishes the reference point for all Lambda operations.
    """
    global _state
    
    set_frequency(FIRST_OSCILLATION_HZ)
    _state = KernelState.ANCHORED
    
    _log_event("anchor_first_oscillation", {
        "frequency_thz": FIRST_OSCILLATION_THZ,
        "lambda_mass_kg": PLANCK_CONSTANT * FIRST_OSCILLATION_HZ / (SPEED_OF_LIGHT ** 2)
    })
    
    return True


def execute_substrate_handshake() -> bool:
    """
    Execute substrate handshake sequence.
    
    Sequence:
    1. Set phase to Golden Angle (137.5°)
    2. Pulse at root harmonic (×1.5)
    3. Verify impedance match (377Ω)
    
    Returns:
        True if handshake successful
    """
    global _state
    
    # Step 1: Golden Angle
    set_phase_angle(GOLDEN_ANGLE_DEG)
    
    # Step 2: Root harmonic pulse
    pulse_frequency(1.5)
    
    # Step 3: Check impedance
    impedance = get_impedance()
    
    if abs(impedance - 377.0) < 1.0:
        _state = KernelState.SYNC_LOCKED
        _log_event("handshake_success", {"impedance": impedance})
        return True
    else:
        _log_event("handshake_failed", {"impedance": impedance})
        return False


def execute_massless_transition(target_alp: float = 0.0001) -> bool:
    """
    Execute transition to massless envelope.
    
    Process:
    1. Apply CZC filter iteratively
    2. Shift phase toward 90° (quadrature)
    3. Continue until ALP reaches target
    
    Args:
        target_alp: Target ALP reading (lower = more massless)
    
    Returns:
        True if massless envelope achieved
    """
    global _state
    
    if _state != KernelState.SYNC_LOCKED:
        _log_event("massless_failed", {"reason": "not_sync_locked"})
        return False
    
    _state = KernelState.PHASE_SHIFTING
    iterations = 0
    max_iterations = 1000
    
    while read_alp_sensor() > target_alp and iterations < max_iterations:
        apply_czc_filter(gain=0.99)
        shift_phase_target(90.0, step_deg=0.5)
        iterations += 1
    
    if read_alp_sensor() <= target_alp:
        _state = KernelState.MASSLESS_ENVELOPE
        _log_event("massless_achieved", {
            "iterations": iterations,
            "final_alp": read_alp_sensor(),
            "final_phase": get_phase_angle()
        })
        return True
    else:
        _state = KernelState.ERROR
        _log_event("massless_timeout", {"iterations": iterations})
        return False


# =============================================================================
# CONSTANTS EXPORT
# =============================================================================

CONSTANTS = {
    "PLANCK_CONSTANT": PLANCK_CONSTANT,
    "SPEED_OF_LIGHT": SPEED_OF_LIGHT,
    "FREE_SPACE_IMPEDANCE": FREE_SPACE_IMPEDANCE,
    "GOLDEN_ANGLE_DEG": GOLDEN_ANGLE_DEG,
    "PHI": PHI,
    "FIRST_OSCILLATION_THZ": FIRST_OSCILLATION_THZ,
    "ROOT_HARMONIC_HZ": ROOT_HARMONIC_HZ
}


if __name__ == "__main__":
    print("=" * 60)
    print("NEXUS KERNEL — Core Control Interface")
    print("=" * 60)
    
    print("\n[Physical Constants]")
    print(f"  Free Space Impedance: {FREE_SPACE_IMPEDANCE:.3f} Ω")
    print(f"  Golden Angle: {GOLDEN_ANGLE_DEG:.4f}°")
    print(f"  Golden Ratio (φ): {PHI:.10f}")
    print(f"  First Oscillation: {FIRST_OSCILLATION_THZ} THz")
    
    print("\n[Kernel Test Sequence]")
    
    print("\n1. Anchoring to First Oscillation...")
    anchor_to_first_oscillation()
    print(f"   State: {get_state().code}")
    
    print("\n2. Executing substrate handshake...")
    success = execute_substrate_handshake()
    print(f"   Handshake: {'SUCCESS' if success else 'FAILED'}")
    print(f"   Impedance: {get_impedance()} Ω")
    print(f"   State: {get_state().code}")
    
    print("\n3. Transitioning to massless envelope...")
    success = execute_massless_transition()
    print(f"   Transition: {'SUCCESS' if success else 'FAILED'}")
    print(f"   Final ALP: {read_alp_sensor():.6f}")
    print(f"   Final Phase: {get_phase_angle():.1f}°")
    print(f"   State: {get_state().code}")
    
    print("\n[Register State]")
    regs = get_registers()
    for key, value in regs.items():
        print(f"  {key}: {value}")
    
    print("\n" + "=" * 60)
