"""
Λ — MASTER FIELD EQUATION
=========================

Lambda Boson Substrate: Continuous Complex Scalar Field Implementation
NexusOS Implementation of the Λ-Master Field Equation

This module implements:
1. Continuous Λ-Master Equation (field form) - Nonlinear Schrödinger/Gross-Pitaevskii style
2. Spectral Mass-Pressure (local)
3. Effective Mass Dependence (info-coupled)
4. Information Density (modal)
5. Λ-Stability / Decay Term (decoherence)
6. WNSP Encoding Map (spectral-native signalling)
7. Λ-Gate Operations (unitary evolution)
8. NexusOS Discrete Update (simulation Euler form)
9. Substrate Compliance Rules & Enforcement

Core Equations:
- Master Field: i∂Λ/∂t = [-ℏ²/2m_eff ∇² + V_ext + g|Λ|² + P(I,∇ν)]Λ - iγ(I)Λ
- Spectral Pressure: P(I,∇ν) = βI + ξ|∇ν|²
- Effective Mass: m_eff(I) = m₀[1 + αI(x,t)]
- Lambda Mass: Λ = hf/c²

Physical Constants:
- h = 6.626 × 10⁻³⁴ J·s (Planck constant)
- ℏ = h/2π (reduced Planck constant)
- c = 299,792,458 m/s (speed of light)

Author: NexusOS / WNSP Protocol
License: AGPL-3.0 (Copyleft)
"""

import math
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Any, Callable, Optional
from enum import Enum
import hashlib
import time


# Physical Constants
from .constants import PLANCK_CONSTANT, SPEED_OF_LIGHT, HBAR
REDUCED_PLANCK = HBAR  # ℏ — alias kept for readability within this module
BOLTZMANN = 1.380649e-23  # J/K


class ComplianceRule(Enum):
    """Substrate compliance constraint types."""
    COHERENCE_FLOOR = "C1"      # |Λ|² ≥ Λ_min
    PRESSURE_BOUND = "C2"       # P(I,∇ν) ≤ P_max
    ENTROPY_CONSTRAINT = "C3"  # S[Λ] ≤ S_max
    FAIRNESS = "C4"            # |w_a|² ≤ W_fair


class EnforcementMethod(Enum):
    """Constraint enforcement methods."""
    PROJECTION = "A"  # Hard enforcement - project onto manifold
    PENALTY = "B"     # Soft enforcement - add penalty to loss


@dataclass
class LambdaFieldState:
    """
    Complex scalar field state |Λ(x,t)⟩.
    
    The field amplitude at each point encodes:
    - Amplitude |Λ| → local Lambda mass density
    - Phase arg(Λ) → quantum phase for interference
    - Gradient ∇Λ → momentum/flow direction
    """
    amplitude: complex = 1.0 + 0j
    position: Tuple[float, ...] = (0.0,)
    frequency: float = 1e12  # Hz
    info_density: float = 0.0
    coherence: float = 1.0
    timestamp: float = field(default_factory=time.time)
    
    @property
    def magnitude(self) -> float:
        """Field magnitude |Λ|."""
        return abs(self.amplitude)
    
    @property
    def phase(self) -> float:
        """Field phase arg(Λ)."""
        return float(np.angle(self.amplitude))
    
    @property
    def probability_density(self) -> float:
        """|Λ|² - probability/mass density."""
        return self.magnitude ** 2
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c² × |Λ|² (mass-equivalent)."""
        return (PLANCK_CONSTANT * self.frequency / (SPEED_OF_LIGHT ** 2)) * self.probability_density
    
    @property
    def energy(self) -> float:
        """E = hf × |Λ|² (field energy)."""
        return PLANCK_CONSTANT * self.frequency * self.probability_density


@dataclass
class SpectralPressure:
    """
    Spectral Mass-Pressure P(I, ∇ν).
    
    P = βI + ξ|∇ν|²
    
    Where:
    - I = information density (modal)
    - ∇ν = spectral gradient
    - β, ξ = coupling constants
    """
    beta: float = 1.0  # Info-pressure coupling
    xi: float = 0.1    # Spectral gradient coupling
    
    def calculate(self, info_density: float, spectral_gradient: float) -> float:
        """Calculate spectral pressure."""
        return self.beta * info_density + self.xi * (spectral_gradient ** 2)
    
    def gradient_contribution(self, spectral_gradient: float) -> float:
        """Contribution from spectral gradient alone."""
        return self.xi * (spectral_gradient ** 2)


@dataclass
class EffectiveMass:
    """
    Effective Mass Dependence m_eff(I).
    
    m_eff(I) = m₀[1 + αI(x,t)]
    
    The effective mass depends on local information density,
    creating info-coupled dynamics.
    """
    m0: float = 1.0      # Base mass (normalized)
    alpha: float = 0.1   # Info-mass coupling
    
    def calculate(self, info_density: float) -> float:
        """Calculate effective mass at given info density."""
        return self.m0 * (1 + self.alpha * info_density)
    
    def kinetic_coefficient(self, info_density: float) -> float:
        """ℏ²/2m_eff coefficient for Laplacian."""
        m_eff = self.calculate(info_density)
        return (REDUCED_PLANCK ** 2) / (2 * m_eff)


@dataclass
class InformationDensity:
    """
    Information Density I(x,t) (modal).
    
    I(x,t) = Σ_k |a_k|² log(1/|a_k|²)
    
    Where a_k are modal amplitudes. This is essentially
    the local entropy density of the field.
    """
    modal_amplitudes: List[complex] = field(default_factory=list)
    
    def calculate(self) -> float:
        """Calculate modal information density."""
        if not self.modal_amplitudes:
            return 0.0
        
        total = 0.0
        for a in self.modal_amplitudes:
            p = abs(a) ** 2
            if p > 1e-15:  # Avoid log(0)
                total += p * math.log(1.0 / p)
        return total
    
    def entropy(self) -> float:
        """Shannon entropy of modal distribution."""
        return self.calculate()


@dataclass 
class DecoherenceModel:
    """
    Λ-Stability / Decay Term (decoherence).
    
    γ(I) = γ₀ + γ₁I
    
    Acts as imaginary potential: higher I → faster coherence loss.
    The field evolves as Λ → Λ·exp(-γt) under pure decoherence.
    """
    gamma0: float = 0.01  # Base decoherence rate
    gamma1: float = 0.1   # Info-dependent decoherence
    
    def rate(self, info_density: float) -> float:
        """Calculate decoherence rate γ(I)."""
        return self.gamma0 + self.gamma1 * info_density
    
    def decay_factor(self, info_density: float, dt: float) -> float:
        """Decay factor exp(-γdt) for timestep dt."""
        gamma = self.rate(info_density)
        return math.exp(-gamma * dt)
    
    def apply_decoherence(self, amplitude: complex, info_density: float, dt: float) -> complex:
        """Apply decoherence to field amplitude."""
        factor = self.decay_factor(info_density, dt)
        return amplitude * factor


@dataclass
class WNSPEncoder:
    """
    WNSP Encoding Map (spectral-native signalling).
    
    Represent a WNSP message as modulation of local frequency ν and phase φ.
    
    Continuous encoding:
    s(x,t) = Re{Λ(x,t)} · exp(i·2πν(x)t + iφ(x))
    
    Where σ(x) is the spectral-state symbol.
    """
    base_frequency: float = 1e12  # Hz
    phase_levels: int = 8  # Number of phase quantization levels
    
    def encode_symbol(self, symbol: int, position: float = 0.0) -> Tuple[float, float]:
        """
        Encode a symbol as (frequency_shift, phase).
        
        Returns (ν(x), φ(x)) for the symbol.
        """
        freq_shift = symbol * 1e9  # 1 GHz per symbol level
        phase = (2 * math.pi * symbol) / self.phase_levels
        return (self.base_frequency + freq_shift, phase)
    
    def decode_signal(self, frequency: float, phase: float) -> int:
        """Decode frequency and phase back to symbol."""
        freq_shift = frequency - self.base_frequency
        symbol_from_freq = int(round(freq_shift / 1e9))
        symbol_from_phase = int(round(phase * self.phase_levels / (2 * math.pi))) % self.phase_levels
        return symbol_from_freq  # Primary decoding from frequency
    
    def capacity(self, bandwidth: float, snr: float) -> float:
        """
        Shannon capacity in Lambda mode.
        
        C = B · log₂(1 + SNR · |Λ|²/⟨|Λ|²⟩)
        
        Simplified to standard Shannon for now.
        """
        return bandwidth * math.log2(1 + snr)


@dataclass
class LambdaGate:
    """
    Λ-Gate (unitary operation model for photonic logic).
    
    Gate action as time-evolution under effective gate Hamiltonian:
    Û_gate = exp(-i·Ĥ_gate·τ_gate/ℏ)
    
    Example Hamiltonian (phase-shift + pressure control):
    Ĥ_gate = θ_phase·n̂ + θ_spec·Ŝ(ν) + η|Λ|²
    """
    gate_type: str
    theta_phase: float = 0.0  # Phase shift parameter
    theta_spec: float = 0.0   # Spectral gating parameter
    eta: float = 0.0          # Density-dependent phase velocity
    tau_gate: float = 1e-12   # Gate operation time (ps)
    
    def apply(self, state: LambdaFieldState) -> LambdaFieldState:
        """Apply gate operation to field state."""
        # Phase rotation
        phase_evolution = self.theta_phase * state.probability_density
        
        # Spectral shift
        new_freq = state.frequency * (1 + self.theta_spec * 1e-6)
        
        # Density-dependent phase
        density_phase = self.eta * state.probability_density * self.tau_gate
        
        # Total phase evolution
        total_phase = phase_evolution + density_phase
        new_amplitude = state.amplitude * np.exp(1j * total_phase)
        
        return LambdaFieldState(
            amplitude=new_amplitude,
            position=state.position,
            frequency=new_freq,
            info_density=state.info_density,
            coherence=state.coherence * 0.999,  # Small coherence cost
            timestamp=time.time()
        )
    
    @staticmethod
    def phase_shift(theta: float) -> 'LambdaGate':
        """Create phase-shift gate."""
        return LambdaGate(gate_type="PHASE_SHIFT", theta_phase=theta)
    
    @staticmethod
    def spectral_gate(theta_spec: float) -> 'LambdaGate':
        """Create spectral gating operation."""
        return LambdaGate(gate_type="SPECTRAL", theta_spec=theta_spec)
    
    @staticmethod
    def kerr_gate(eta: float) -> 'LambdaGate':
        """Create Kerr (density-dependent) gate."""
        return LambdaGate(gate_type="KERR", eta=eta)


@dataclass
class SubstrateConstraint:
    """
    Substrate Compliance Rule.
    
    Examples:
    - C1: Coherence floor |Λ|² ≥ Λ_min
    - C2: Pressure bound P(I,∇ν) ≤ P_max
    - C3: Entropy constraint S[Λ] ≤ S_max
    - C4: Fairness |w_a|² ≤ W_fair
    """
    rule_type: ComplianceRule
    threshold: float
    is_upper_bound: bool = True  # True for ≤, False for ≥
    penalty_weight: float = 100.0  # λ for penalty method
    
    def evaluate(self, value: float) -> float:
        """Evaluate constraint violation (0 = compliant)."""
        if self.is_upper_bound:
            return max(0, value - self.threshold)
        else:
            return max(0, self.threshold - value)
    
    def is_satisfied(self, value: float, tolerance: float = 1e-6) -> bool:
        """Check if constraint is satisfied."""
        return self.evaluate(value) <= tolerance
    
    def penalty(self, value: float) -> float:
        """Calculate penalty for constraint violation."""
        violation = self.evaluate(value)
        return self.penalty_weight * (violation ** 2)


class SubstrateEnforcer:
    """
    Substrate Compliance Enforcement.
    
    Two methods:
    A. Projection onto constraint manifold (hard enforcement)
    B. Penalty method (soft enforcement for learning agents)
    """
    
    def __init__(self, method: EnforcementMethod = EnforcementMethod.PROJECTION):
        self.method = method
        self.constraints: List[SubstrateConstraint] = []
        
        # Default constraints
        self._init_default_constraints()
    
    def _init_default_constraints(self):
        """Initialize default substrate constraints."""
        # C1: Coherence floor
        self.constraints.append(SubstrateConstraint(
            rule_type=ComplianceRule.COHERENCE_FLOOR,
            threshold=0.1,  # Λ_min
            is_upper_bound=False
        ))
        
        # C2: Pressure bound
        self.constraints.append(SubstrateConstraint(
            rule_type=ComplianceRule.PRESSURE_BOUND,
            threshold=100.0,  # P_max
            is_upper_bound=True
        ))
        
        # C3: Entropy constraint
        self.constraints.append(SubstrateConstraint(
            rule_type=ComplianceRule.ENTROPY_CONSTRAINT,
            threshold=10.0,  # S_max
            is_upper_bound=True
        ))
        
        # C4: Fairness
        self.constraints.append(SubstrateConstraint(
            rule_type=ComplianceRule.FAIRNESS,
            threshold=0.33,  # W_fair (33% max)
            is_upper_bound=True
        ))
    
    def project(self, state: LambdaFieldState, 
                pressure: float, entropy: float, 
                write_power: float) -> LambdaFieldState:
        """
        Project state onto constraint manifold (Method A).
        
        Λ' = argmin_{Λ* ∈ legal} ||Λ* - Λ||²
        """
        new_amplitude = state.amplitude
        new_coherence = state.coherence
        
        # C1: Coherence floor - boost if below minimum
        c1 = self.constraints[0]
        if state.probability_density < c1.threshold:
            # Scale amplitude to meet minimum
            scale = math.sqrt(c1.threshold / max(state.probability_density, 1e-15))
            new_amplitude = state.amplitude * min(scale, 2.0)  # Cap scaling
        
        # C2: Pressure bound - cannot directly project, flag for throttling
        # (handled at field evolution level)
        
        # C4: Fairness - clamp write power
        c4 = self.constraints[3]
        if write_power > c4.threshold:
            # This would be applied to the write kernel, not the state
            pass
        
        return LambdaFieldState(
            amplitude=new_amplitude,
            position=state.position,
            frequency=state.frequency,
            info_density=state.info_density,
            coherence=new_coherence,
            timestamp=time.time()
        )
    
    def total_penalty(self, state: LambdaFieldState,
                      pressure: float, entropy: float,
                      write_power: float) -> float:
        """
        Calculate total penalty for constraint violations (Method B).
        
        L_penalty = Σ_k λ_k · max(0, g_k(Λ))²
        """
        total = 0.0
        
        # C1: Coherence floor
        total += self.constraints[0].penalty(state.probability_density)
        
        # C2: Pressure bound
        total += self.constraints[1].penalty(pressure)
        
        # C3: Entropy
        total += self.constraints[2].penalty(entropy)
        
        # C4: Fairness
        total += self.constraints[3].penalty(write_power)
        
        return total
    
    def compliance_score(self, state: LambdaFieldState,
                         pressure: float, entropy: float,
                         write_power: float) -> float:
        """
        Compliance score (1 = fully compliant).
        
        χ(t) = Π_k 𝟙[g_k(Λ) ≤ 0]
        """
        values = [
            state.probability_density,
            pressure,
            entropy,
            write_power
        ]
        
        all_satisfied = all(
            c.is_satisfied(v) for c, v in zip(self.constraints, values)
        )
        
        return 1.0 if all_satisfied else 0.0


class MasterFieldEquation:
    """
    Λ — MASTER FIELD EQUATION (continuous, complex scalar field).
    
    iℏ ∂Λ/∂t = [-ℏ²/2m_eff ∇² + V_ext + g|Λ|² + P(I,∇ν)]Λ - iγ(I)Λ
    
    This is a nonlinear Schrödinger/Gross-Pitaevskii style equation extended with:
    - Info-coupling via m_eff(I)
    - Spectrum pressure through P(I,∇ν)
    - Absorptive decoherence via γ(I)
    """
    
    def __init__(self, grid_size: int = 64, dx: float = 1.0):
        self.grid_size = grid_size
        self.dx = dx
        self.dt = 0.001  # Normalized timestep (dimensionless units)
        
        # Physical parameters (normalized units for stability)
        self.g = 0.1  # Nonlinear coupling (reduced for stability)
        self.v_ext = 0.0  # External potential (can be position-dependent)
        self.hbar_normalized = 1.0  # Use normalized units
        
        # Components
        self.pressure = SpectralPressure()
        self.effective_mass = EffectiveMass()
        self.decoherence = DecoherenceModel()
        self.enforcer = SubstrateEnforcer()
        self.encoder = WNSPEncoder()
        
        # Field state (1D for simplicity, extend to 2D/3D)
        self.field = np.ones(grid_size, dtype=complex)
        self.info_density = np.zeros(grid_size)
        self.spectral_freq = np.ones(grid_size) * 1e12  # Base frequency
        
        # Tracking
        self.tick = 0
        self.total_energy = 0.0
        self.coherence_order = 1.0
    
    def laplacian(self, psi: np.ndarray) -> np.ndarray:
        """Compute ∇²Λ using finite differences."""
        lap = np.zeros_like(psi)
        lap[1:-1] = (psi[2:] - 2*psi[1:-1] + psi[:-2]) / (self.dx ** 2)
        # Periodic boundary conditions
        lap[0] = (psi[1] - 2*psi[0] + psi[-1]) / (self.dx ** 2)
        lap[-1] = (psi[0] - 2*psi[-1] + psi[-2]) / (self.dx ** 2)
        return lap
    
    def spectral_gradient(self) -> np.ndarray:
        """Compute |∇ν| - spectral frequency gradient."""
        grad = np.zeros(self.grid_size)
        grad[1:-1] = np.abs(self.spectral_freq[2:] - self.spectral_freq[:-2]) / (2 * self.dx)
        return grad
    
    def compute_pressure_field(self) -> np.ndarray:
        """Compute P(I, ∇ν) across the field."""
        spec_grad = self.spectral_gradient()
        return np.array([
            self.pressure.calculate(self.info_density[i], spec_grad[i])
            for i in range(self.grid_size)
        ])
    
    def compute_effective_mass_field(self) -> np.ndarray:
        """Compute m_eff(I) across the field."""
        return np.array([
            self.effective_mass.calculate(self.info_density[i])
            for i in range(self.grid_size)
        ])
    
    def compute_decoherence_field(self) -> np.ndarray:
        """Compute γ(I) across the field."""
        return np.array([
            self.decoherence.rate(self.info_density[i])
            for i in range(self.grid_size)
        ])
    
    def evolve_step(self) -> Dict[str, Any]:
        """
        NexusOS Discrete Update (time-step Euler form).
        
        Λ(t+dt) = Λ(t) + dt · (1/iℏ)[Ĥ_eff Λ - iγΛ]
        
        Using normalized units for numerical stability.
        """
        # Compute field-dependent quantities
        m_eff = self.compute_effective_mass_field()
        P_field = self.compute_pressure_field()
        gamma_field = self.compute_decoherence_field()
        
        # Kinetic term: -ℏ²/2m_eff ∇²Λ (normalized units: ℏ=1)
        kinetic_coeff = self.hbar_normalized / (2 * m_eff)
        kinetic_term = -kinetic_coeff * self.laplacian(self.field)
        
        # Potential terms: (V_ext + g|Λ|² + P)Λ
        density = np.abs(self.field) ** 2
        potential = self.v_ext + self.g * density + P_field * 0.01  # Scale pressure
        potential_term = potential * self.field
        
        # Hamiltonian action
        H_psi = kinetic_term + potential_term
        
        # Time evolution (Euler method) - normalized units
        # dΛ/dt = -i·H·Λ - γ·Λ
        dLambda_dt = -1j * H_psi - gamma_field * self.field
        
        # Update field with stability check
        new_field = self.field + self.dt * dLambda_dt
        
        # Clamp field magnitude to prevent explosion
        magnitudes = np.abs(new_field)
        max_mag = 10.0
        scale = np.where(magnitudes > max_mag, max_mag / magnitudes, 1.0)
        self.field = new_field * scale
        
        # Update info density (decay toward zero)
        self.info_density = self.info_density * (1 - 0.01 * self.dt)
        
        # Compute metrics
        self.tick += 1
        self.total_energy = self._compute_energy()
        self.coherence_order = self._compute_coherence_order()
        
        # Compliance check
        avg_pressure = float(np.mean(P_field))
        entropy = float(np.sum(self.info_density))
        mean_amp = np.mean(self.field)
        compliance = self.enforcer.compliance_score(
            LambdaFieldState(amplitude=complex(mean_amp)),
            avg_pressure, entropy, 0.1
        )
        
        return {
            "tick": self.tick,
            "total_energy": self.total_energy,
            "coherence_order": self.coherence_order,
            "mean_density": float(np.mean(density)),
            "max_pressure": float(np.max(P_field)),
            "compliance": compliance
        }
    
    def _compute_energy(self) -> float:
        """
        Compute field Hamiltonian (energy).
        
        H[Λ] = ∫[ℏ²/2m_eff |∇Λ|² + V|Λ|² + g/2 |Λ|⁴]dx
        Using normalized units (ℏ=1).
        """
        density = np.abs(self.field) ** 2
        gradient = np.gradient(self.field, self.dx)
        
        kinetic = np.sum(np.abs(gradient) ** 2) * self.hbar_normalized / (2 * self.effective_mass.m0)
        potential = np.sum(self.v_ext * density)
        interaction = np.sum(0.5 * self.g * density ** 2)
        
        return float(kinetic + potential + interaction) * self.dx
    
    def _compute_coherence_order(self) -> float:
        """
        Coherence metric (order parameter).
        
        Φ_order = |∫Λ dx|² / ∫|Λ|² dx
        
        1 = fully coherent, 0 = incoherent
        """
        numerator = np.abs(np.sum(self.field)) ** 2
        denominator = np.sum(np.abs(self.field) ** 2) * self.grid_size
        
        if denominator < 1e-15:
            return 0.0
        return float(numerator / denominator)
    
    def apply_write_kernel(self, position: int, amplitude: complex, 
                           agent_id: str = "default") -> Dict[str, Any]:
        """
        Agent write action - modifies field at position.
        
        Λ(x,t+dt) = Λ(x,t) + W_a(x) · action_a
        
        Subject to fairness constraints.
        """
        # Fairness check
        write_power = abs(amplitude) ** 2
        c4 = self.enforcer.constraints[3]
        
        if write_power > c4.threshold:
            # Clamp write power
            amplitude = amplitude * math.sqrt(c4.threshold / write_power)
            write_power = c4.threshold
        
        # Gaussian write kernel centered at position
        sigma = 2.0
        x = np.arange(self.grid_size)
        kernel = np.exp(-((x - position) ** 2) / (2 * sigma ** 2))
        kernel = kernel / np.sum(kernel)  # Normalize
        
        # Apply write
        self.field = self.field + amplitude * kernel
        
        # Update info density
        self.info_density = self.info_density + abs(amplitude) * kernel
        
        return {
            "agent_id": agent_id,
            "position": position,
            "amplitude": abs(amplitude),
            "write_power": write_power,
            "kernel_width": sigma
        }
    
    def apply_read_kernel(self, position: int, strength: float = 0.1,
                          agent_id: str = "default") -> Dict[str, Any]:
        """
        Agent read action - extracts information from field.
        
        Returns field state at position and reduces local info density.
        """
        # Gaussian read kernel
        sigma = 2.0
        x = np.arange(self.grid_size)
        kernel = np.exp(-((x - position) ** 2) / (2 * sigma ** 2))
        kernel = kernel / np.sum(kernel)
        
        # Read field
        read_value = np.sum(self.field * kernel)
        read_info = np.sum(self.info_density * kernel)
        
        # Reduce info density (information extracted)
        self.info_density = self.info_density - strength * read_info * kernel
        self.info_density = np.maximum(self.info_density, 0)  # Non-negative
        
        return {
            "agent_id": agent_id,
            "position": position,
            "read_amplitude": abs(read_value),
            "read_phase": np.angle(read_value),
            "info_extracted": float(read_info * strength)
        }
    
    def apply_gate(self, gate: LambdaGate, position: int) -> Dict[str, Any]:
        """Apply Λ-gate at specified position."""
        # Create local state
        local_state = LambdaFieldState(
            amplitude=self.field[position],
            position=(float(position),),
            frequency=self.spectral_freq[position],
            info_density=self.info_density[position]
        )
        
        # Apply gate
        new_state = gate.apply(local_state)
        
        # Update field
        self.field[position] = new_state.amplitude
        self.spectral_freq[position] = new_state.frequency
        
        return {
            "gate_type": gate.gate_type,
            "position": position,
            "amplitude_before": abs(local_state.amplitude),
            "amplitude_after": abs(new_state.amplitude),
            "phase_shift": new_state.phase - local_state.phase
        }
    
    def run_simulation(self, steps: int = 100) -> List[Dict[str, Any]]:
        """Run simulation for specified number of steps."""
        history = []
        for _ in range(steps):
            result = self.evolve_step()
            history.append(result)
        return history
    
    def get_state(self) -> Dict[str, Any]:
        """Get current field state."""
        return {
            "tick": self.tick,
            "grid_size": self.grid_size,
            "total_energy": self.total_energy,
            "coherence_order": self.coherence_order,
            "mean_amplitude": float(np.mean(np.abs(self.field))),
            "max_amplitude": float(np.max(np.abs(self.field))),
            "mean_info_density": float(np.mean(self.info_density)),
            "compliance_status": "COMPLIANT" if self.coherence_order > 0.1 else "DEGRADED"
        }


class AgentPolicy:
    """
    Agent-level dynamics (policy that controls writes and reads).
    
    Agent issues action a_t that maps to write kernel W_a.
    Using penalty method, agent updates via gradient step on reward.
    """
    
    def __init__(self, agent_id: str, field: MasterFieldEquation):
        self.agent_id = agent_id
        self.field = field
        self.learning_rate = 0.01
        self.reward_history: List[float] = []
        self.action_history: List[Dict] = []
    
    def compute_reward(self, action_result: Dict, 
                       field_state: Dict) -> float:
        """
        Compute reward for action.
        
        R = task_reward - λ·penalty(constraints)
        """
        # Base reward from action effect
        base_reward = action_result.get("amplitude_after", 0) * 0.1
        
        # Penalty from constraint violations
        penalty = 0.0
        if field_state["coherence_order"] < 0.1:
            penalty += 10.0  # Coherence violation
        
        if field_state.get("compliance", 1.0) < 1.0:
            penalty += 5.0
        
        return base_reward - penalty
    
    def take_action(self, action_type: str, position: int, 
                    amplitude: complex = 0.1+0j) -> Dict[str, Any]:
        """Execute action and compute reward."""
        if action_type == "write":
            result = self.field.apply_write_kernel(position, amplitude, self.agent_id)
        elif action_type == "read":
            result = self.field.apply_read_kernel(position, abs(amplitude), self.agent_id)
        elif action_type == "gate":
            gate = LambdaGate.phase_shift(float(np.angle(amplitude)))
            result = self.field.apply_gate(gate, position)
        else:
            result = {"error": "Unknown action type"}
        
        # Get field state and compute reward
        state = self.field.get_state()
        reward = self.compute_reward(result, state)
        
        # Record history
        self.reward_history.append(reward)
        self.action_history.append({
            "action_type": action_type,
            "position": position,
            "amplitude": abs(amplitude),
            "reward": reward
        })
        
        return {
            "action_result": result,
            "field_state": state,
            "reward": reward,
            "cumulative_reward": sum(self.reward_history)
        }


def demo_master_field_equation():
    """
    Demonstrate the Λ-Master Field Equation simulation.
    """
    print("=" * 60)
    print("Λ — MASTER FIELD EQUATION SIMULATION")
    print("=" * 60)
    print()
    
    # Create field
    field = MasterFieldEquation(grid_size=64)
    print(f"Field initialized: {field.grid_size} grid points")
    print(f"Initial coherence order: {field.coherence_order:.4f}")
    print()
    
    # Create agent
    agent = AgentPolicy("agent_001", field)
    print(f"Agent created: {agent.agent_id}")
    print()
    
    # Run some actions
    print("--- Agent Actions ---")
    
    # Write action
    result = agent.take_action("write", position=32, amplitude=0.5+0.2j)
    print(f"Write at pos 32: reward = {result['reward']:.4f}")
    
    # Read action
    result = agent.take_action("read", position=32, amplitude=0.1+0j)
    print(f"Read at pos 32: reward = {result['reward']:.4f}")
    
    # Gate action
    result = agent.take_action("gate", position=32, amplitude=0.5j)
    print(f"Gate at pos 32: reward = {result['reward']:.4f}")
    print()
    
    # Evolve field
    print("--- Field Evolution (100 steps) ---")
    history = field.run_simulation(steps=100)
    
    print(f"Final tick: {history[-1]['tick']}")
    print(f"Final energy: {history[-1]['total_energy']:.6e}")
    print(f"Final coherence: {history[-1]['coherence_order']:.4f}")
    print(f"Compliance: {history[-1]['compliance']:.2f}")
    print()
    
    # Show constraint system
    print("--- Substrate Constraints ---")
    for c in field.enforcer.constraints:
        print(f"  {c.rule_type.value}: {c.rule_type.name}")
        print(f"    Threshold: {c.threshold}")
        print(f"    Type: {'≤' if c.is_upper_bound else '≥'}")
    print()
    
    # Final state
    print("--- Final Field State ---")
    state = field.get_state()
    for key, value in state.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.6f}")
        else:
            print(f"  {key}: {value}")
    
    return field


if __name__ == "__main__":
    demo_master_field_equation()
