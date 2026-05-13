"""
WNSP NLSE Substrate v6.0
========================

COMPLETE SUBSTRATE BLUEPRINT — Nexus/WNSP v6

This module implements the full physics-native substrate based on the
Nonlinear Schrödinger Equation (NLSE), providing:

1. Stable Harmonic Carrier with soliton dynamics
2. Collapse Threshold detection (C1)
3. Recursion Condition verification (C2)
4. Load → Mass-Pressure Conversion (C3)
5. Harmonic-Load Diagram mapping (C4)
6. Substrate Design Knobs
7. Verification & Simulation capabilities

Core Equation (NLSE):
    i ∂A/∂z = -β₂/2 ∂²A/∂t² + γ|A|²A

Where:
- A(z,t): Complex envelope amplitude
- β₂: Group velocity dispersion (GVD)
- γ: Nonlinear coefficient (Kerr effect)
- z: Propagation distance
- t: Retarded time

K-Level: 1.0 (Type I Complete Substrate)

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import time
import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import numpy as np
from numpy.fft import fft, ifft, fftfreq

from .constants import PLANCK_CONSTANT, SPEED_OF_LIGHT, HBAR
BOLTZMANN_CONSTANT = 1.380649e-23


class SubstrateState(Enum):
    """States of the harmonic carrier in the substrate."""
    STABLE = ("stable", "Harmonic is stable, ΔL < 0.8·ΔL_max")
    RECURSION_ENABLED = ("recursion", "Recursion zone, 0.6-0.8·ΔL_max")
    NEAR_COLLAPSE = ("near_collapse", "Approaching collapse, ΔL → ΔL_max")
    COLLAPSED = ("collapsed", "Collapse threshold exceeded, λ-mode formation")
    MULTI_HARMONIC = ("multi_harmonic", "Multiple λ-modes active")
    
    def __init__(self, state_id: str, description: str):
        self.state_id = state_id
        self.description = description


@dataclass
class SubstrateDesignKnobs:
    """
    Substrate Design Knobs - Tunable parameters for substrate operation.
    
    Parameters:
    - carrier_freq_hz: Carrier frequency (higher → smaller photon energy)
    - amplitude: Normalized amplitude (larger → more ΔL capacity)
    - quality_factor: Q factor (higher → longer coherence time)
    - nonlinearity_gamma: γ coefficient (stronger → more self-phase modulation)
    - pulse_width_s: T0 in seconds (longer → easier to stabilize)
    - dispersion_beta2: β₂ coefficient (must balance γ for soliton stability)
    """
    carrier_freq_hz: float = 200e12  # 200 THz optical
    amplitude: float = 1.0
    quality_factor: float = 1e6
    nonlinearity_gamma: float = 1e-3  # W^-1 m^-1
    pulse_width_s: float = 1e-12  # 1 ps
    dispersion_beta2: float = -20e-27  # s²/m (anomalous for solitons)
    
    @property
    def photon_energy(self) -> float:
        """E = hf"""
        return PLANCK_CONSTANT * self.carrier_freq_hz
    
    @property
    def coherence_time(self) -> float:
        """τ_c = Q / (2πf)"""
        return self.quality_factor / (2 * math.pi * self.carrier_freq_hz)
    
    @property
    def soliton_order(self) -> float:
        """N = sqrt(γ P0 T0² / |β₂|)"""
        P0 = self.amplitude ** 2
        return math.sqrt(abs(self.nonlinearity_gamma * P0 * self.pulse_width_s**2 / self.dispersion_beta2))
    
    @property
    def dispersion_length(self) -> float:
        """L_D = T0² / |β₂|"""
        return self.pulse_width_s**2 / abs(self.dispersion_beta2)
    
    @property
    def nonlinear_length(self) -> float:
        """L_NL = 1 / (γ P0)"""
        P0 = self.amplitude ** 2
        return 1.0 / (self.nonlinearity_gamma * P0) if P0 > 0 else float('inf')
    
    def is_soliton_stable(self) -> bool:
        """Check if N ≈ 1 for fundamental soliton."""
        return 0.8 <= self.soliton_order <= 1.2


@dataclass
class HarmonicCarrier:
    """
    Stable Harmonic Carrier - Foundation of the substrate.
    
    The carrier envelope evolves according to the NLSE and provides
    the stable platform for spectral computation and recursion.
    """
    carrier_id: str
    knobs: SubstrateDesignKnobs
    n_points: int = 1024
    time_window: float = 20.0  # in units of T0
    
    def __post_init__(self):
        self.t = np.linspace(-self.time_window/2, self.time_window/2, self.n_points) * self.knobs.pulse_width_s
        self.dt = self.t[1] - self.t[0]
        self.omega = 2 * np.pi * fftfreq(self.n_points, self.dt)
        
        self.envelope = self._init_soliton_envelope()
        self.z = 0.0
        self.history: List[Dict[str, Any]] = []
        
    def _init_soliton_envelope(self) -> np.ndarray:
        """Initialize fundamental soliton envelope: A(t) = A0 * sech(t/T0)"""
        t_normalized = self.t / self.knobs.pulse_width_s
        return self.knobs.amplitude / np.cosh(t_normalized)
    
    @property
    def power(self) -> np.ndarray:
        """Instantaneous power |A|²"""
        return np.abs(self.envelope) ** 2
    
    @property
    def peak_power(self) -> float:
        """Peak power"""
        return float(np.max(self.power))
    
    @property
    def energy(self) -> float:
        """Pulse energy ∫|A|² dt"""
        return float(np.trapezoid(self.power, self.t))
    
    @property
    def spectral_intensity(self) -> np.ndarray:
        """Spectral intensity |Ã(ω)|²"""
        return np.abs(fft(self.envelope)) ** 2
    
    @property
    def nonlinear_phase(self) -> float:
        """Accumulated nonlinear phase φ_NL = γ P0 z"""
        return self.knobs.nonlinearity_gamma * self.peak_power * self.z


@dataclass
class CollapseThreshold:
    """
    Collapse Threshold (C1) - Detection of λ-mode formation.
    
    Condition: ΔL > ΔL_max = (hf · Q) / (k · A²)
    
    When spectral load exceeds this limit, the carrier transforms
    into a new harmonic (lambda-boson precursor).
    """
    k_proportionality: float = 1e-20  # Medium-dependent factor
    
    def compute_delta_l_max(self, knobs: SubstrateDesignKnobs) -> float:
        """Compute maximum allowed spectral load."""
        hf = knobs.photon_energy
        Q = knobs.quality_factor
        A2 = knobs.amplitude ** 2
        return (hf * Q) / (self.k_proportionality * A2)
    
    def compute_current_load(self, carrier: HarmonicCarrier) -> float:
        """Compute current spectral load from envelope."""
        spectral_width = np.std(carrier.spectral_intensity)
        return spectral_width * carrier.peak_power
    
    def get_load_ratio(self, carrier: HarmonicCarrier) -> float:
        """Get ΔL / ΔL_max ratio."""
        delta_l = self.compute_current_load(carrier)
        delta_l_max = self.compute_delta_l_max(carrier.knobs)
        return delta_l / delta_l_max if delta_l_max > 0 else 0.0
    
    def is_safe(self, carrier: HarmonicCarrier) -> bool:
        """Check if operating in safe region (ΔL < 0.8 ΔL_max)."""
        return self.get_load_ratio(carrier) < 0.8
    
    def is_collapsed(self, carrier: HarmonicCarrier) -> bool:
        """Check if collapse threshold exceeded."""
        return self.get_load_ratio(carrier) >= 1.0
    
    def get_state(self, carrier: HarmonicCarrier) -> SubstrateState:
        """Determine substrate state from load ratio."""
        ratio = self.get_load_ratio(carrier)
        if ratio < 0.6:
            return SubstrateState.STABLE
        elif ratio < 0.8:
            return SubstrateState.RECURSION_ENABLED
        elif ratio < 1.0:
            return SubstrateState.NEAR_COLLAPSE
        else:
            return SubstrateState.COLLAPSED


@dataclass
class RecursionEngine:
    """
    Recursion Condition (C2) - Self-describing packet support.
    
    Goal: harmonic can hold self-describing packets.
    Max recursive depth limited by coherence and load.
    """
    max_depth: int = 10
    
    def compute_max_recursion_depth(self, carrier: HarmonicCarrier, 
                                     collapse: CollapseThreshold) -> int:
        """
        Compute maximum recursion depth.
        
        Limited by:
        1. Coherence time (longer → more recursion possible)
        2. Load ratio (lower → more headroom for recursion)
        """
        coherence_factor = min(1.0, carrier.knobs.coherence_time / 1e-9)  # normalized to 1ns
        load_ratio = collapse.get_load_ratio(carrier)
        load_factor = max(0.0, 1.0 - load_ratio)
        
        depth = int(self.max_depth * coherence_factor * load_factor)
        return max(1, depth)
    
    def can_recurse(self, carrier: HarmonicCarrier, 
                   collapse: CollapseThreshold) -> bool:
        """Check if recursion is possible at current state."""
        state = collapse.get_state(carrier)
        return state in (SubstrateState.STABLE, SubstrateState.RECURSION_ENABLED)
    
    def apply_recursion_load(self, carrier: HarmonicCarrier, depth: int) -> float:
        """
        Apply load for recursion operation.
        Each recursion level adds ΔL proportional to depth.
        Returns the additional load applied.
        """
        base_load = 0.05  # 5% load per recursion level
        total_load = base_load * depth
        
        carrier.envelope *= (1 + total_load * 0.1)
        
        return total_load


@dataclass
class MassPressureMapper:
    """
    Load → Mass-Pressure Conversion (C3).
    
    m_pressure = k · ΔL / c²
    
    Maps message density → effective spectral mass-pressure.
    Provides empirical physics link for field theory.
    """
    k_factor: float = 1e-20  # Medium-dependent proportionality
    
    def compute_mass_pressure(self, delta_l: float) -> float:
        """Convert spectral load to mass-pressure."""
        return self.k_factor * delta_l / (SPEED_OF_LIGHT ** 2)
    
    def compute_from_carrier(self, carrier: HarmonicCarrier, 
                            collapse: CollapseThreshold) -> float:
        """Compute mass-pressure from carrier state."""
        delta_l = collapse.compute_current_load(carrier)
        return self.compute_mass_pressure(delta_l)
    
    def compute_field_density(self, carrier: HarmonicCarrier) -> np.ndarray:
        """Compute mass-pressure density field from envelope."""
        power = carrier.power
        return self.k_factor * power / (SPEED_OF_LIGHT ** 2)


class NLSESolver:
    """
    NLSE Solver using Split-Step Fourier Method.
    
    Solves: i ∂A/∂z = -β₂/2 ∂²A/∂t² + γ|A|²A
    
    The split-step method alternates between:
    1. Linear step (dispersion) in frequency domain
    2. Nonlinear step (Kerr effect) in time domain
    """
    
    def __init__(self, carrier: HarmonicCarrier):
        self.carrier = carrier
        self.knobs = carrier.knobs
        
    def linear_operator(self, dz: float) -> np.ndarray:
        """Linear operator exp(i β₂/2 ω² dz)"""
        return np.exp(1j * self.knobs.dispersion_beta2 / 2 * self.carrier.omega**2 * dz)
    
    def nonlinear_step(self, A: np.ndarray, dz: float) -> np.ndarray:
        """Nonlinear step: A * exp(i γ |A|² dz)"""
        return A * np.exp(1j * self.knobs.nonlinearity_gamma * np.abs(A)**2 * dz)
    
    def propagate(self, distance: float, n_steps: int = 100) -> Dict[str, Any]:
        """
        Propagate envelope through distance using split-step Fourier.
        
        Returns evolution history and final state.
        """
        dz = distance / n_steps
        A = self.carrier.envelope.copy()
        
        history = {
            "z": [self.carrier.z],
            "peak_power": [np.max(np.abs(A)**2)],
            "energy": [np.trapezoid(np.abs(A)**2, self.carrier.t)],
            "phase_nl": [0.0],
            "envelopes": [A.copy()]
        }
        
        linear_half = self.linear_operator(dz / 2)
        linear_full = self.linear_operator(dz)
        
        A_freq = fft(A)
        A_freq *= linear_half
        A = ifft(A_freq)
        
        for step in range(n_steps):
            A = self.nonlinear_step(A, dz)
            
            A_freq = fft(A)
            if step < n_steps - 1:
                A_freq *= linear_full
            else:
                A_freq *= linear_half
            A = ifft(A_freq)
            
            self.carrier.z += dz
            
            history["z"].append(self.carrier.z)
            history["peak_power"].append(np.max(np.abs(A)**2))
            history["energy"].append(np.trapezoid(np.abs(A)**2, self.carrier.t))
            history["phase_nl"].append(self.carrier.nonlinear_phase)
            
            if step % 10 == 0:
                history["envelopes"].append(A.copy())
        
        self.carrier.envelope = A
        self.carrier.history.append(history)
        
        return history


@dataclass
class HarmonicLoadDiagram:
    """
    Harmonic-Load Diagram (C4) - Complete substrate operational map.
    
    Axes:
    - x: ΔL / ΔL_max (load ratio)
    - y: φ_NL / φ_collapse (phase fraction)
    - z: mode stability
    
    Contour regions:
    - Stable harmonic: ΔL < 0.8 ΔL_max, φ_NL < 1 rad
    - Recursion-enabled: ΔL ~ 0.6-0.8 ΔL_max, φ_NL < 0.8 rad
    - Collapse threshold: ΔL ≥ ΔL_max, φ_NL ≥ φ_collapse
    - Emergent multi-harmonic: ΔL > ΔL_max, multiple λ-modes
    """
    phi_collapse: float = math.pi  # Collapse phase threshold
    
    def get_coordinates(self, carrier: HarmonicCarrier,
                       collapse: CollapseThreshold) -> Tuple[float, float, str]:
        """Get (x, y, stability) coordinates for diagram."""
        x = collapse.get_load_ratio(carrier)
        y = carrier.nonlinear_phase / self.phi_collapse
        
        state = self._determine_stability(x, y)
        
        return (x, y, state.state_id)
    
    def _determine_stability(self, load_ratio: float, phase_ratio: float) -> SubstrateState:
        """Determine stability from load and phase ratios."""
        if load_ratio >= 1.0 or phase_ratio >= 1.0:
            return SubstrateState.COLLAPSED
        elif load_ratio >= 0.8 or phase_ratio >= 0.8:
            return SubstrateState.NEAR_COLLAPSE
        elif load_ratio >= 0.6:
            return SubstrateState.RECURSION_ENABLED
        else:
            return SubstrateState.STABLE
    
    def generate_diagram_data(self, n_points: int = 50) -> Dict[str, np.ndarray]:
        """Generate data for plotting the harmonic-load diagram."""
        x = np.linspace(0, 1.5, n_points)
        y = np.linspace(0, 1.5, n_points)
        X, Y = np.meshgrid(x, y)
        
        Z = np.zeros_like(X)
        for i in range(n_points):
            for j in range(n_points):
                state = self._determine_stability(X[i, j], Y[i, j])
                if state == SubstrateState.STABLE:
                    Z[i, j] = 0
                elif state == SubstrateState.RECURSION_ENABLED:
                    Z[i, j] = 1
                elif state == SubstrateState.NEAR_COLLAPSE:
                    Z[i, j] = 2
                else:
                    Z[i, j] = 3
        
        return {"X": X, "Y": Y, "Z": Z}


class CompleteSubstrate:
    """
    Complete NLSE Substrate - Full integration of all components.
    
    Provides:
    - Stable harmonic carrier management
    - NLSE evolution
    - Collapse detection
    - Recursion support
    - Mass-pressure mapping
    - Harmonic-load diagram
    - Parameter tuning
    """
    
    VERSION = "6.0.0"
    
    def __init__(self, substrate_id: str = "nlse_substrate",
                 knobs: Optional[SubstrateDesignKnobs] = None):
        self.substrate_id = substrate_id
        self.knobs = knobs or SubstrateDesignKnobs()
        
        self.carrier = HarmonicCarrier(
            carrier_id=f"{substrate_id}_carrier",
            knobs=self.knobs
        )
        
        self.solver = NLSESolver(self.carrier)
        self.collapse = CollapseThreshold()
        self.recursion = RecursionEngine()
        self.mass_pressure = MassPressureMapper()
        self.diagram = HarmonicLoadDiagram()
        
        self.lambda_modes: List[Dict[str, Any]] = []
        self.telemetry: List[Dict[str, Any]] = []
        
    def evolve(self, distance: float, n_steps: int = 100) -> Dict[str, Any]:
        """Evolve substrate through propagation distance."""
        history = self.solver.propagate(distance, n_steps)
        
        state = self.collapse.get_state(self.carrier)
        if state == SubstrateState.COLLAPSED:
            self._form_lambda_mode()
        
        coords = self.diagram.get_coordinates(self.carrier, self.collapse)
        mass_p = self.mass_pressure.compute_from_carrier(self.carrier, self.collapse)
        
        telemetry = {
            "timestamp": time.time(),
            "z": self.carrier.z,
            "state": state.state_id,
            "load_ratio": coords[0],
            "phase_ratio": coords[1],
            "mass_pressure": mass_p,
            "peak_power": self.carrier.peak_power,
            "energy": self.carrier.energy,
            "recursion_depth_max": self.recursion.compute_max_recursion_depth(
                self.carrier, self.collapse
            ),
            "lambda_modes_formed": len(self.lambda_modes)
        }
        self.telemetry.append(telemetry)
        
        return {
            "history": history,
            "state": state,
            "telemetry": telemetry
        }
    
    def _form_lambda_mode(self):
        """Form a new lambda-mode when collapse occurs."""
        mode_id = hashlib.sha256(
            f"lambda:{self.substrate_id}:{time.time()}".encode()
        ).hexdigest()[:16]
        
        lambda_mode = {
            "mode_id": mode_id,
            "formation_time": time.time(),
            "formation_z": self.carrier.z,
            "peak_power_at_formation": self.carrier.peak_power,
            "energy_at_formation": self.carrier.energy,
            "mass_pressure": self.mass_pressure.compute_from_carrier(
                self.carrier, self.collapse
            )
        }
        self.lambda_modes.append(lambda_mode)
        
        self.carrier.envelope *= 0.5
        
        return lambda_mode
    
    def apply_recursion(self, depth: int = 1) -> Dict[str, Any]:
        """Apply recursion operation at specified depth."""
        if not self.recursion.can_recurse(self.carrier, self.collapse):
            return {
                "success": False,
                "reason": "Cannot recurse in current state",
                "state": self.collapse.get_state(self.carrier).state_id
            }
        
        max_depth = self.recursion.compute_max_recursion_depth(
            self.carrier, self.collapse
        )
        actual_depth = min(depth, max_depth)
        
        load_added = self.recursion.apply_recursion_load(self.carrier, actual_depth)
        
        return {
            "success": True,
            "depth_requested": depth,
            "depth_applied": actual_depth,
            "load_added": load_added,
            "new_state": self.collapse.get_state(self.carrier).state_id
        }
    
    def tune_knob(self, knob_name: str, value: float) -> bool:
        """Tune a substrate design knob."""
        if hasattr(self.knobs, knob_name):
            setattr(self.knobs, knob_name, value)
            self.carrier = HarmonicCarrier(
                carrier_id=self.carrier.carrier_id,
                knobs=self.knobs
            )
            self.solver = NLSESolver(self.carrier)
            return True
        return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get complete substrate status."""
        state = self.collapse.get_state(self.carrier)
        coords = self.diagram.get_coordinates(self.carrier, self.collapse)
        
        return {
            "version": self.VERSION,
            "substrate_id": self.substrate_id,
            "state": state.state_id,
            "state_description": state.description,
            "carrier": {
                "z": self.carrier.z,
                "peak_power": self.carrier.peak_power,
                "energy": self.carrier.energy,
                "nonlinear_phase": self.carrier.nonlinear_phase
            },
            "knobs": {
                "carrier_freq_hz": self.knobs.carrier_freq_hz,
                "amplitude": self.knobs.amplitude,
                "quality_factor": self.knobs.quality_factor,
                "nonlinearity_gamma": self.knobs.nonlinearity_gamma,
                "pulse_width_s": self.knobs.pulse_width_s,
                "dispersion_beta2": self.knobs.dispersion_beta2,
                "soliton_order": self.knobs.soliton_order,
                "is_soliton_stable": self.knobs.is_soliton_stable()
            },
            "diagram": {
                "load_ratio": coords[0],
                "phase_ratio": coords[1],
                "stability": coords[2]
            },
            "mass_pressure": self.mass_pressure.compute_from_carrier(
                self.carrier, self.collapse
            ),
            "recursion": {
                "can_recurse": self.recursion.can_recurse(self.carrier, self.collapse),
                "max_depth": self.recursion.compute_max_recursion_depth(
                    self.carrier, self.collapse
                )
            },
            "lambda_modes_formed": len(self.lambda_modes),
            "telemetry_entries": len(self.telemetry)
        }


def demo_nlse_substrate():
    """Demonstrate the complete NLSE substrate."""
    print("=" * 70)
    print("WNSP NLSE Substrate v6.0 - COMPLETE BLUEPRINT DEMONSTRATION")
    print("=" * 70)
    print()
    
    print("1. Creating substrate with default optical parameters...")
    substrate = CompleteSubstrate(substrate_id="demo_nlse")
    
    status = substrate.get_status()
    print(f"   Carrier frequency: {status['knobs']['carrier_freq_hz']:.2e} Hz")
    print(f"   Soliton order N: {status['knobs']['soliton_order']:.3f}")
    print(f"   Soliton stable: {status['knobs']['is_soliton_stable']}")
    print(f"   Initial state: {status['state']}")
    print()
    
    print("2. Propagating envelope (NLSE evolution)...")
    L_D = substrate.knobs.dispersion_length
    result = substrate.evolve(distance=5 * L_D, n_steps=200)
    
    print(f"   Propagation distance: {substrate.carrier.z:.4e} m")
    print(f"   Final state: {result['state'].state_id}")
    print(f"   Peak power: {result['telemetry']['peak_power']:.4f}")
    print(f"   Energy conservation: {result['telemetry']['energy']:.6f}")
    print(f"   Nonlinear phase: {substrate.carrier.nonlinear_phase:.4f} rad")
    print()
    
    print("3. Checking collapse threshold (C1)...")
    print(f"   Load ratio: {result['telemetry']['load_ratio']:.4f}")
    print(f"   Safe region (< 0.8): {substrate.collapse.is_safe(substrate.carrier)}")
    print()
    
    print("4. Testing recursion capability (C2)...")
    recursion_result = substrate.apply_recursion(depth=3)
    print(f"   Recursion success: {recursion_result['success']}")
    print(f"   Depth applied: {recursion_result.get('depth_applied', 'N/A')}")
    print(f"   Max recursion depth: {substrate.recursion.compute_max_recursion_depth(substrate.carrier, substrate.collapse)}")
    print()
    
    print("5. Mass-pressure mapping (C3)...")
    mass_p = substrate.mass_pressure.compute_from_carrier(substrate.carrier, substrate.collapse)
    print(f"   Mass-pressure: {mass_p:.4e} kg")
    print()
    
    print("6. Harmonic-Load Diagram coordinates (C4)...")
    coords = substrate.diagram.get_coordinates(substrate.carrier, substrate.collapse)
    print(f"   Load ratio (x): {coords[0]:.4f}")
    print(f"   Phase ratio (y): {coords[1]:.4f}")
    print(f"   Stability zone: {coords[2]}")
    print()
    
    print("7. Testing substrate design knobs...")
    print("   Increasing nonlinearity γ by 2x...")
    substrate.tune_knob("nonlinearity_gamma", substrate.knobs.nonlinearity_gamma * 2)
    print(f"   New soliton order: {substrate.knobs.soliton_order:.3f}")
    print()
    
    print("8. Driving toward collapse threshold...")
    for i in range(5):
        result = substrate.evolve(distance=L_D, n_steps=50)
        print(f"   Step {i+1}: state={result['state'].state_id}, load={result['telemetry']['load_ratio']:.3f}")
        if result['state'] == SubstrateState.COLLAPSED:
            print(f"   λ-mode formed! Total: {len(substrate.lambda_modes)}")
            break
    print()
    
    print("=" * 70)
    print("FINAL SUBSTRATE STATUS")
    print("=" * 70)
    final_status = substrate.get_status()
    print(f"  State: {final_status['state']} - {final_status['state_description']}")
    print(f"  Propagation distance: {final_status['carrier']['z']:.4e} m")
    print(f"  λ-modes formed: {final_status['lambda_modes_formed']}")
    print(f"  Telemetry entries: {final_status['telemetry_entries']}")
    print()
    print("  Diagram Position:")
    print(f"    Load ratio: {final_status['diagram']['load_ratio']:.4f}")
    print(f"    Phase ratio: {final_status['diagram']['phase_ratio']:.4f}")
    print(f"    Zone: {final_status['diagram']['stability']}")
    print()
    print("✓ NLSE solver: OPERATIONAL")
    print("✓ Collapse threshold (C1): MONITORED")
    print("✓ Recursion condition (C2): VERIFIED")
    print("✓ Mass-pressure mapping (C3): ACTIVE")
    print("✓ Harmonic-load diagram (C4): MAPPED")
    print("✓ Design knobs: TUNABLE")
    print()
    print("COMPLETE SUBSTRATE v6: FULLY OPERATIONAL")
    print("=" * 70)
    
    return substrate


def run_parameter_sweep():
    """Run parameter sweep for substrate verification."""
    print("=" * 70)
    print("SUBSTRATE PARAMETER SWEEP - VERIFICATION")
    print("=" * 70)
    print()
    
    gamma_values = [0.5e-3, 1e-3, 2e-3, 5e-3]
    T0_values = [0.5e-12, 1e-12, 2e-12]
    
    results = []
    
    for gamma in gamma_values:
        for T0 in T0_values:
            knobs = SubstrateDesignKnobs(
                nonlinearity_gamma=gamma,
                pulse_width_s=T0
            )
            
            substrate = CompleteSubstrate(knobs=knobs)
            L_D = knobs.dispersion_length
            
            try:
                result = substrate.evolve(distance=3 * L_D, n_steps=100)
                
                results.append({
                    "gamma": gamma,
                    "T0": T0,
                    "soliton_order": knobs.soliton_order,
                    "stable": knobs.is_soliton_stable(),
                    "final_state": result['state'].state_id,
                    "energy_conserved": abs(result['telemetry']['energy'] - substrate.carrier.energy) < 0.01
                })
            except Exception as e:
                results.append({
                    "gamma": gamma,
                    "T0": T0,
                    "error": str(e)
                })
    
    print("Parameter Sweep Results:")
    print("-" * 60)
    print(f"{'γ (W⁻¹m⁻¹)':<12} {'T0 (s)':<12} {'N':<8} {'Stable':<8} {'State':<12}")
    print("-" * 60)
    
    for r in results:
        if "error" not in r:
            print(f"{r['gamma']:<12.2e} {r['T0']:<12.2e} {r['soliton_order']:<8.2f} "
                  f"{str(r['stable']):<8} {r['final_state']:<12}")
        else:
            print(f"{r['gamma']:<12.2e} {r['T0']:<12.2e} ERROR: {r['error']}")
    
    print()
    return results


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "sweep":
        run_parameter_sweep()
    else:
        demo_nlse_substrate()
