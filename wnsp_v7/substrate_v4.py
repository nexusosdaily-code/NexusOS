"""
WNSP v7.0 — Lambda Gate Substrate v4
=====================================

The next-generation substrate integrating Lambda Gates with physics-based 
verification. Extends substrate_v3's Lambda-Truth foundation with photonic 
computing operations.

Core Theory:
1. Lambda Mode: |λ⟩ = (ν, A(t), φ(t), ℓ, s) — carrier frequency, amplitude, phase, OAM, polarization
2. Master Equation: E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)
3. Effective Hamiltonian: Ĥ_eff = h·ν̂ + α·K̂ + β·L̂
4. Time Evolution: |λ(t + dt)⟩ = exp(-i·Ĥ_eff·dt/ℏ)|λ(t)⟩ + G(u)|λ(t)⟩

Lambda Gate Primitives:
1. Phase-Shift Φ(θ) — electro-optic phase shifter
2. Gain G(α) — variable optical attenuator/amplifier  
3. Mode-Mixer M(κ) — multiport interferometer
4. OAM-Rotor L(Δℓ) — spiral phase plate
5. Phase-Gradient ∇Φ — acoustic-optic modulator
6. Density-Swap S — resonator coupling
7. Coherence-Amplify A_c — parametric amplifier
8. Stabilizer D(τ) — active feedback locking

CE-1 Protocol (Coherence Engineering):
- Energy pool management per tick
- Coherence margin enforcement
- Non-dominance rules
- Adaptive fidelity control

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import numpy as np
import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Callable, Union
from enum import Enum

try:
    from .constants import PLANCK_CONSTANT, SPEED_OF_LIGHT, HBAR
    from .substrate_v3 import (
        LambdaTruthSubstrate,
        LambdaField,
        TruthOperator,
        RealityState,
        TruthState,
        VacuumChaos,
    )
    from .substrate_coordinator import (
        SubstrateCoordinator,
        SubstrateTransaction,
        OperationType,
        get_substrate_coordinator
    )
except ImportError:
    import math as _math
    PLANCK_CONSTANT = 6.62607015e-34
    SPEED_OF_LIGHT = 299792458
    HBAR = PLANCK_CONSTANT / (2 * _math.pi)
    LambdaTruthSubstrate = None
    SubstrateCoordinator = None

ALPHA_CURVATURE = 1e-30
BETA_ORBITAL = 1e-32
DEFAULT_COHERENCE_MIN = 0.1
DEFAULT_ENERGY_POOL = 1e-15


class GateType(Enum):
    """
    Lambda Gate primitive types.
    
    Each gate has defined physical implementation and algebraic action.
    """
    PHASE_SHIFT = ("phase_shift", "Φ(θ)", "Electro-optic phase shifter", 1e-20, 0.001)
    GAIN = ("gain", "G(α)", "Variable optical attenuator/amplifier", 5e-20, 0.01)
    MODE_MIXER = ("mode_mixer", "M(κ)", "Multiport interferometer", 3e-20, 0.005)
    OAM_ROTOR = ("oam_rotor", "L(Δℓ)", "Spiral phase plate/SLM", 2e-20, 0.003)
    PHASE_GRADIENT = ("phase_gradient", "∇Φ", "Acoustic-optic modulator", 8e-20, 0.02)
    DENSITY_SWAP = ("density_swap", "S", "High-finesse resonator coupling", 1e-19, 0.05)
    COHERENCE_AMPLIFY = ("coherence_amplify", "A_c", "Parametric amplifier", 2e-19, -0.03)
    STABILIZER = ("stabilizer", "D(τ)", "Active feedback locking", 5e-21, -0.01)
    
    def __init__(self, gate_id: str, symbol: str, physical: str, base_energy: float, coherence_delta: float):
        self.gate_id = gate_id
        self.symbol = symbol
        self.physical = physical
        self.base_energy = base_energy
        self.coherence_delta = coherence_delta
    
    @property
    def is_unitary(self) -> bool:
        """Whether gate preserves amplitude norm."""
        return self in [GateType.PHASE_SHIFT, GateType.MODE_MIXER, GateType.OAM_ROTOR]
    
    @property
    def is_nonlinear(self) -> bool:
        """Whether gate has nonlinear dependence on input."""
        return self in [GateType.GAIN, GateType.PHASE_GRADIENT, GateType.COHERENCE_AMPLIFY]


@dataclass
class LambdaMode:
    """
    A Lambda mode state vector representing a photonic program state.
    
    |λ⟩ = (ν, A(t), φ(t), ℓ, s)
    
    Where:
    - ν: carrier frequency (Hz)
    - A: time-envelope amplitude (complex)
    - φ: phase function (radians)
    - ℓ: OAM index (integer, orbital angular momentum)
    - s: polarization/spin index (+1, -1, or 0)
    """
    frequency: float
    amplitude: complex = 1.0 + 0j
    phase: float = 0.0
    oam_index: int = 0
    spin: int = 0
    coherence: float = 1.0
    mode_id: str = ""
    creation_tick: int = 0
    
    def __post_init__(self):
        if not self.mode_id:
            self.mode_id = hashlib.sha256(
                f"{self.frequency}:{self.amplitude}:{self.oam_index}:{time.time()}".encode()
            ).hexdigest()[:12]
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c² × |A|²"""
        return PLANCK_CONSTANT * self.frequency * abs(self.amplitude)**2 / (SPEED_OF_LIGHT ** 2)
    
    @property
    def energy(self) -> float:
        """E = hf × |A|²"""
        return PLANCK_CONSTANT * self.frequency * abs(self.amplitude)**2
    
    @property
    def wavelength(self) -> float:
        """λ = c/f"""
        return SPEED_OF_LIGHT / self.frequency if self.frequency > 0 else float('inf')
    
    @property
    def angular_frequency(self) -> float:
        """ω = 2πf"""
        return 2 * math.pi * self.frequency
    
    @property
    def phase_curvature(self) -> float:
        """
        Phase curvature ||K̂||² - measure of spectral complexity.
        Higher OAM and phase variations increase curvature.
        """
        base_curvature = abs(self.oam_index) * 0.1
        phase_contribution = abs(math.sin(self.phase) * math.cos(self.phase)) * 0.05
        return base_curvature + phase_contribution
    
    @property
    def orbital_complexity(self) -> float:
        """
        O(L̂) - orbital structure complexity norm.
        Function of |ℓ| and mode purity.
        """
        return abs(self.oam_index) * (2 - self.coherence)
    
    def effective_hamiltonian(self) -> float:
        """
        Ĥ_eff = h·ν + α·||K̂||² + β·O(L̂)
        
        The effective Hamiltonian governing mode dynamics.
        """
        freq_term = PLANCK_CONSTANT * self.frequency
        curvature_term = ALPHA_CURVATURE * self.phase_curvature**2
        orbital_term = BETA_ORBITAL * self.orbital_complexity
        return freq_term + curvature_term + orbital_term
    
    def psi_at(self, t: float) -> complex:
        """
        Wave function at time t.
        
        ψ(t) = A × e^(i(ωt + φ + ℓθ)) × coherence_decay
        """
        age = t - (self.creation_tick * 0.001)
        decay = math.exp(-age / (3600 * max(self.coherence, 0.01)))
        
        phase_total = self.angular_frequency * t + self.phase + self.oam_index * 0.1
        return self.amplitude * decay * np.exp(1j * phase_total)
    
    def time_evolve(self, dt: float) -> 'LambdaMode':
        """
        Evolve mode under Ĥ_eff for time dt.
        
        |λ(t + dt)⟩ = exp(-i·Ĥ_eff·dt/ℏ)|λ(t)⟩
        """
        h_eff = self.effective_hamiltonian()
        phase_evolution = -h_eff * dt / HBAR
        
        new_phase = self.phase + phase_evolution
        new_amplitude = self.amplitude * np.exp(1j * phase_evolution)
        new_coherence = max(0.01, self.coherence - 0.0001 * dt)
        
        return LambdaMode(
            frequency=self.frequency,
            amplitude=new_amplitude,
            phase=new_phase % (2 * math.pi),
            oam_index=self.oam_index,
            spin=self.spin,
            coherence=new_coherence,
            mode_id=self.mode_id,
            creation_tick=self.creation_tick
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "mode_id": self.mode_id,
            "frequency_hz": self.frequency,
            "wavelength_m": self.wavelength,
            "amplitude": complex(self.amplitude),
            "amplitude_magnitude": abs(self.amplitude),
            "phase_rad": self.phase,
            "oam_index": self.oam_index,
            "spin": self.spin,
            "coherence": self.coherence,
            "lambda_mass_kg": self.lambda_mass,
            "energy_j": self.energy,
            "phase_curvature": self.phase_curvature,
            "orbital_complexity": self.orbital_complexity,
            "h_effective_j": self.effective_hamiltonian()
        }
    
    def copy(self) -> 'LambdaMode':
        """Create a deep copy of the mode."""
        return LambdaMode(
            frequency=self.frequency,
            amplitude=self.amplitude,
            phase=self.phase,
            oam_index=self.oam_index,
            spin=self.spin,
            coherence=self.coherence,
            mode_id=self.mode_id + "_copy",
            creation_tick=self.creation_tick
        )


@dataclass
class GateOperation:
    """
    A scheduled gate operation on one or more Lambda modes.
    
    Contains gate type, parameters, and execution metadata.
    """
    gate_type: GateType
    target_modes: List[str]
    parameters: Dict[str, Any] = field(default_factory=dict)
    energy_cost: float = 0.0
    coherence_delta: float = 0.0
    tick_scheduled: int = 0
    tick_executed: Optional[int] = None
    success: bool = False
    result_modes: List[str] = field(default_factory=list)
    gate_id: str = ""
    program_id: str = ""
    
    def __post_init__(self):
        if not self.gate_id:
            self.gate_id = hashlib.sha256(
                f"{self.gate_type.gate_id}:{self.target_modes}:{time.time()}".encode()
            ).hexdigest()[:16]
        
        if self.energy_cost == 0:
            self.energy_cost = self.gate_type.base_energy
            complexity = len(self.target_modes) * (1 + sum(abs(v) for v in self.parameters.values() if isinstance(v, (int, float))))
            self.energy_cost *= max(1, complexity * 0.1)
        
        if self.coherence_delta == 0:
            self.coherence_delta = self.gate_type.coherence_delta
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "gate_id": self.gate_id,
            "gate_type": self.gate_type.gate_id,
            "symbol": self.gate_type.symbol,
            "target_modes": self.target_modes,
            "parameters": self.parameters,
            "energy_cost_j": self.energy_cost,
            "coherence_delta": self.coherence_delta,
            "tick_scheduled": self.tick_scheduled,
            "tick_executed": self.tick_executed,
            "success": self.success,
            "program_id": self.program_id
        }


@dataclass
class CoherencePool:
    """
    CE-1 Coherence Engineering pool for managing energy and coherence budgets.
    
    Key structures:
    - E_pool(t): total coherent energy available per time window
    - E_alloc(p): energy allocation for each program p
    - c_vec(mode): coherence vector per mode
    """
    total_energy: float = DEFAULT_ENERGY_POOL
    remaining_energy: float = DEFAULT_ENERGY_POOL
    coherence_minimum: float = DEFAULT_COHERENCE_MIN
    program_allocations: Dict[str, float] = field(default_factory=dict)
    mode_coherence: Dict[str, float] = field(default_factory=dict)
    tick: int = 0
    non_dominance_threshold: float = 0.05
    
    def allocate_program(self, program_id: str, fraction: float = 0.1) -> float:
        """Allocate energy fraction to a program."""
        if sum(self.program_allocations.values()) + fraction > 1.0:
            available = 1.0 - sum(self.program_allocations.values())
            fraction = min(fraction, available)
        
        allocation = self.total_energy * fraction
        self.program_allocations[program_id] = allocation
        return allocation
    
    def can_execute_gate(self, gate: GateOperation, program_id: str) -> Tuple[bool, str]:
        """
        Rule 1: Gate Atomic Budget check.
        
        Verify: ΔE_gate ≤ E_alloc(p) × fraction_available
        """
        program_alloc = self.program_allocations.get(program_id, 0)
        
        if program_alloc == 0:
            program_alloc = self.allocate_program(program_id, fraction=0.5)
        
        if gate.energy_cost > self.remaining_energy:
            return False, f"Pool exhausted: {gate.energy_cost:.2e}J > {self.remaining_energy:.2e}J remaining"
        
        fraction_used = 1 - (self.remaining_energy / self.total_energy) if self.total_energy > 0 else 0
        available_for_gate = program_alloc * (1 - fraction_used * 0.5)
        
        if gate.energy_cost > available_for_gate and gate.energy_cost > self.remaining_energy * 0.5:
            return False, f"Insufficient energy: {gate.energy_cost:.2e}J > {available_for_gate:.2e}J available"
        
        n_programs = len(self.program_allocations)
        if n_programs > 1:
            program_usage_fraction = program_alloc / self.total_energy if self.total_energy > 0 else 0
            if program_usage_fraction > self.non_dominance_threshold * 10:
                return False, f"CE-1 Rule 3: Non-dominance violation ({program_usage_fraction:.1%} > {self.non_dominance_threshold*10:.1%})"
        
        return True, "OK"
    
    def check_coherence_margin(self, mode_id: str, delta: float) -> Tuple[bool, str]:
        """
        Rule 2: Coherence Margin check.
        
        After gate, enforce: ||c_vec_after|| ≥ c_min
        """
        current = self.mode_coherence.get(mode_id, 1.0)
        after = current + delta
        
        if after < self.coherence_minimum:
            return False, f"Coherence below minimum: {after:.3f} < {self.coherence_minimum:.3f}"
        
        return True, "OK"
    
    def consume_energy(self, amount: float, program_id: str) -> bool:
        """Consume energy from pool for a gate execution."""
        if amount > self.remaining_energy:
            return False
        
        self.remaining_energy -= amount
        return True
    
    def update_mode_coherence(self, mode_id: str, delta: float):
        """Update coherence for a mode after gate execution."""
        current = self.mode_coherence.get(mode_id, 1.0)
        self.mode_coherence[mode_id] = max(0.01, min(1.0, current + delta))
    
    def advance_tick(self):
        """Advance to next tick, replenishing pool."""
        self.tick += 1
        self.remaining_energy = min(self.total_energy, self.remaining_energy + self.total_energy * 0.1)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "tick": self.tick,
            "total_energy_j": self.total_energy,
            "remaining_energy_j": self.remaining_energy,
            "utilization_pct": (1 - self.remaining_energy / self.total_energy) * 100 if self.total_energy > 0 else 0,
            "coherence_minimum": self.coherence_minimum,
            "n_programs": len(self.program_allocations),
            "n_modes_tracked": len(self.mode_coherence),
            "non_dominance_threshold": self.non_dominance_threshold
        }


@dataclass
class GateLedgerEntry:
    """
    Audit ledger entry for gate execution.
    
    All allocations and energy draws recorded for governance.
    """
    program_id: str
    gate_id: str
    gate_type: str
    energy_used: float
    coherence_delta: float
    tick: int
    timestamp: float = field(default_factory=time.time)
    success: bool = True
    target_modes: List[str] = field(default_factory=list)
    signature: str = ""
    
    def __post_init__(self):
        if not self.signature:
            content = f"{self.program_id}:{self.gate_id}:{self.energy_used}:{self.tick}:{self.timestamp}"
            self.signature = hashlib.sha256(content.encode()).hexdigest()[:32]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "program_id": self.program_id,
            "gate_id": self.gate_id,
            "gate_type": self.gate_type,
            "E_used": self.energy_used,
            "coherence_delta": self.coherence_delta,
            "tick": self.tick,
            "timestamp": self.timestamp,
            "success": self.success,
            "target_modes": self.target_modes,
            "signature": self.signature
        }


class GateExecutor:
    """
    Executes Lambda Gate operations on modes.
    
    Implements the 8 primitive operators:
    1. Phase-Shift Φ(θ): φ → φ + θ
    2. Gain G(α): A → αA
    3. Mode-Mixer M(κ): Unitary rotation between modes
    4. OAM-Rotor L(Δℓ): ℓ → ℓ + Δℓ
    5. Phase-Gradient ∇Φ: Creates spectral curvature
    6. Density-Swap S: Swap content between modes
    7. Coherence-Amplify A_c: Raise local coherence
    8. Stabilizer D(τ): Reduce phase jitter
    """
    
    def __init__(self):
        self._gate_handlers: Dict[GateType, Callable] = {
            GateType.PHASE_SHIFT: self._execute_phase_shift,
            GateType.GAIN: self._execute_gain,
            GateType.MODE_MIXER: self._execute_mode_mixer,
            GateType.OAM_ROTOR: self._execute_oam_rotor,
            GateType.PHASE_GRADIENT: self._execute_phase_gradient,
            GateType.DENSITY_SWAP: self._execute_density_swap,
            GateType.COHERENCE_AMPLIFY: self._execute_coherence_amplify,
            GateType.STABILIZER: self._execute_stabilizer,
        }
    
    def execute(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        Execute a gate operation on target modes.
        
        Returns (success, updated_modes, message)
        """
        handler = self._gate_handlers.get(gate.gate_type)
        if not handler:
            return False, modes, f"Unknown gate type: {gate.gate_type}"
        
        for mode_id in gate.target_modes:
            if mode_id not in modes:
                return False, modes, f"Mode not found: {mode_id}"
        
        try:
            success, updated_modes, msg = handler(gate, modes)
            return success, updated_modes, msg
        except Exception as e:
            return False, modes, f"Gate execution error: {str(e)}"
    
    def _execute_phase_shift(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        Phase-Shift Φ(θ): φ → φ + θ
        
        Unitary operation, commutes with itself.
        """
        theta = gate.parameters.get("theta", 0.0)
        
        for mode_id in gate.target_modes:
            mode = modes[mode_id]
            new_phase = (mode.phase + theta) % (2 * math.pi)
            modes[mode_id] = LambdaMode(
                frequency=mode.frequency,
                amplitude=mode.amplitude,
                phase=new_phase,
                oam_index=mode.oam_index,
                spin=mode.spin,
                coherence=mode.coherence + gate.coherence_delta,
                mode_id=mode.mode_id,
                creation_tick=mode.creation_tick
            )
        
        return True, modes, f"Phase shifted by {theta:.4f} rad"
    
    def _execute_gain(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        Gain G(α): A → αA
        
        Non-unitary, can amplify or attenuate.
        """
        alpha = gate.parameters.get("alpha", 1.0)
        
        for mode_id in gate.target_modes:
            mode = modes[mode_id]
            new_amplitude = mode.amplitude * alpha
            modes[mode_id] = LambdaMode(
                frequency=mode.frequency,
                amplitude=new_amplitude,
                phase=mode.phase,
                oam_index=mode.oam_index,
                spin=mode.spin,
                coherence=mode.coherence + gate.coherence_delta,
                mode_id=mode.mode_id,
                creation_tick=mode.creation_tick
            )
        
        return True, modes, f"Gain applied: α={alpha:.4f}"
    
    def _execute_mode_mixer(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        Mode-Mixer M(κ): Unitary rotation between two modes.
        
        |A₁'⟩ = cos(κ)|A₁⟩ - sin(κ)|A₂⟩
        |A₂'⟩ = sin(κ)|A₁⟩ + cos(κ)|A₂⟩
        """
        if len(gate.target_modes) < 2:
            return False, modes, "Mode mixer requires 2 modes"
        
        kappa = gate.parameters.get("kappa", math.pi / 4)
        mode1_id, mode2_id = gate.target_modes[0], gate.target_modes[1]
        mode1, mode2 = modes[mode1_id], modes[mode2_id]
        
        new_a1 = math.cos(kappa) * mode1.amplitude - math.sin(kappa) * mode2.amplitude
        new_a2 = math.sin(kappa) * mode1.amplitude + math.cos(kappa) * mode2.amplitude
        
        modes[mode1_id] = LambdaMode(
            frequency=mode1.frequency,
            amplitude=new_a1,
            phase=mode1.phase,
            oam_index=mode1.oam_index,
            spin=mode1.spin,
            coherence=mode1.coherence + gate.coherence_delta,
            mode_id=mode1.mode_id,
            creation_tick=mode1.creation_tick
        )
        modes[mode2_id] = LambdaMode(
            frequency=mode2.frequency,
            amplitude=new_a2,
            phase=mode2.phase,
            oam_index=mode2.oam_index,
            spin=mode2.spin,
            coherence=mode2.coherence + gate.coherence_delta,
            mode_id=mode2.mode_id,
            creation_tick=mode2.creation_tick
        )
        
        return True, modes, f"Modes mixed with κ={kappa:.4f}"
    
    def _execute_oam_rotor(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        OAM-Rotor L(Δℓ): ℓ → ℓ + Δℓ
        
        Changes orbital angular momentum index.
        """
        delta_l = gate.parameters.get("delta_l", 1)
        
        for mode_id in gate.target_modes:
            mode = modes[mode_id]
            new_oam = mode.oam_index + delta_l
            modes[mode_id] = LambdaMode(
                frequency=mode.frequency,
                amplitude=mode.amplitude,
                phase=mode.phase,
                oam_index=new_oam,
                spin=mode.spin,
                coherence=mode.coherence + gate.coherence_delta,
                mode_id=mode.mode_id,
                creation_tick=mode.creation_tick
            )
        
        return True, modes, f"OAM rotated by Δℓ={delta_l}"
    
    def _execute_phase_gradient(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        Phase-Gradient ∇Φ: Creates spectral curvature.
        
        The key operator for generating Lambda-states with increased spectral curvature.
        """
        gradient = gate.parameters.get("gradient", 0.1)
        
        for mode_id in gate.target_modes:
            mode = modes[mode_id]
            new_phase = mode.phase + gradient * mode.oam_index
            new_freq = mode.frequency * (1 + gradient * 0.001)
            
            modes[mode_id] = LambdaMode(
                frequency=new_freq,
                amplitude=mode.amplitude,
                phase=new_phase % (2 * math.pi),
                oam_index=mode.oam_index,
                spin=mode.spin,
                coherence=mode.coherence + gate.coherence_delta,
                mode_id=mode.mode_id,
                creation_tick=mode.creation_tick
            )
        
        return True, modes, f"Phase gradient applied: ∇={gradient:.4f}"
    
    def _execute_density_swap(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        Density-Swap S: Controlled spectral exchange between modes.
        
        Swaps amplitude/phase content between two Lambda shells.
        High coherence cost.
        """
        if len(gate.target_modes) < 2:
            return False, modes, "Density swap requires 2 modes"
        
        swap_fraction = gate.parameters.get("alpha", 0.5)
        mode1_id, mode2_id = gate.target_modes[0], gate.target_modes[1]
        mode1, mode2 = modes[mode1_id], modes[mode2_id]
        
        new_a1 = mode1.amplitude * (1 - swap_fraction) + mode2.amplitude * swap_fraction
        new_a2 = mode2.amplitude * (1 - swap_fraction) + mode1.amplitude * swap_fraction
        new_p1 = mode1.phase * (1 - swap_fraction) + mode2.phase * swap_fraction
        new_p2 = mode2.phase * (1 - swap_fraction) + mode1.phase * swap_fraction
        
        modes[mode1_id] = LambdaMode(
            frequency=mode1.frequency,
            amplitude=new_a1,
            phase=new_p1 % (2 * math.pi),
            oam_index=mode1.oam_index,
            spin=mode1.spin,
            coherence=mode1.coherence + gate.coherence_delta,
            mode_id=mode1.mode_id,
            creation_tick=mode1.creation_tick
        )
        modes[mode2_id] = LambdaMode(
            frequency=mode2.frequency,
            amplitude=new_a2,
            phase=new_p2 % (2 * math.pi),
            oam_index=mode2.oam_index,
            spin=mode2.spin,
            coherence=mode2.coherence + gate.coherence_delta,
            mode_id=mode2.mode_id,
            creation_tick=mode2.creation_tick
        )
        
        return True, modes, f"Density swapped: α={swap_fraction:.2f}"
    
    def _execute_coherence_amplify(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        Coherence-Amplify A_c: Raise local coherence.
        
        Uses pool energy to increase mode coherence (negative delta on pool).
        """
        boost = gate.parameters.get("boost", 0.1)
        
        for mode_id in gate.target_modes:
            mode = modes[mode_id]
            new_coherence = min(1.0, mode.coherence + boost)
            modes[mode_id] = LambdaMode(
                frequency=mode.frequency,
                amplitude=mode.amplitude,
                phase=mode.phase,
                oam_index=mode.oam_index,
                spin=mode.spin,
                coherence=new_coherence,
                mode_id=mode.mode_id,
                creation_tick=mode.creation_tick
            )
        
        return True, modes, f"Coherence amplified by {boost:.2f}"
    
    def _execute_stabilizer(self, gate: GateOperation, modes: Dict[str, LambdaMode]) -> Tuple[bool, Dict[str, LambdaMode], str]:
        """
        Stabilizer D(τ): Active feedback locking.
        
        Reduces phase jitter for specified time window τ.
        """
        tau = gate.parameters.get("tau", 0.01)
        stabilization = min(0.1, tau * 0.1)
        
        for mode_id in gate.target_modes:
            mode = modes[mode_id]
            new_coherence = min(1.0, mode.coherence + stabilization)
            modes[mode_id] = LambdaMode(
                frequency=mode.frequency,
                amplitude=mode.amplitude,
                phase=mode.phase,
                oam_index=mode.oam_index,
                spin=mode.spin,
                coherence=new_coherence,
                mode_id=mode.mode_id,
                creation_tick=mode.creation_tick
            )
        
        return True, modes, f"Stabilized for τ={tau:.4f}s"


class GateSequencer:
    """
    Tick-based gate scheduler implementing CE-1 protocol.
    
    Maintains priority queue of gate tasks sorted by (priority, earliest_ready_time).
    Enforces energy budgets and coherence constraints per tick.
    """
    
    def __init__(self, pool: Optional[CoherencePool] = None):
        self.pool = pool or CoherencePool()
        self.executor = GateExecutor()
        self.pending_gates: List[GateOperation] = []
        self.executed_gates: List[GateOperation] = []
        self.ledger: List[GateLedgerEntry] = []
        self.modes: Dict[str, LambdaMode] = {}
    
    def register_mode(self, mode: LambdaMode):
        """Register a Lambda mode for gate operations."""
        self.modes[mode.mode_id] = mode
        self.pool.mode_coherence[mode.mode_id] = mode.coherence
    
    def _estimate_snr(self, gate: GateOperation) -> float:
        """
        Estimate Signal-to-Noise Ratio for CE-1 Rule 4 (Adaptive Fidelity).
        
        SNR is based on:
        - Available energy vs required energy
        - Mode coherence levels
        - Gate complexity
        """
        if not gate.target_modes:
            return 1.0
        
        energy_ratio = self.pool.remaining_energy / gate.energy_cost if gate.energy_cost > 0 else 1.0
        
        avg_coherence = sum(
            self.pool.mode_coherence.get(m, 1.0) for m in gate.target_modes
        ) / len(gate.target_modes)
        
        complexity_factor = 1.0
        if gate.gate_type.is_nonlinear:
            complexity_factor = 0.8
        if len(gate.target_modes) > 1:
            complexity_factor *= 0.9
        
        snr = min(energy_ratio, 10.0) * avg_coherence * complexity_factor
        return snr
    
    def schedule_gate(self, gate: GateOperation, priority: int = 0) -> Tuple[bool, str]:
        """
        Schedule a gate for execution.
        
        Validates energy budget before accepting.
        """
        can_exec, reason = self.pool.can_execute_gate(gate, gate.program_id)
        if not can_exec:
            return False, f"Gate rejected: {reason}"
        
        for mode_id in gate.target_modes:
            coh_ok, coh_msg = self.pool.check_coherence_margin(mode_id, gate.coherence_delta)
            if not coh_ok:
                return False, f"Coherence check failed: {coh_msg}"
        
        gate.tick_scheduled = self.pool.tick
        self.pending_gates.append(gate)
        self.pending_gates.sort(key=lambda g: (priority, g.tick_scheduled))
        
        return True, f"Gate {gate.gate_id} scheduled for tick {self.pool.tick}"
    
    def execute_tick(self) -> List[GateLedgerEntry]:
        """
        Execute one tick of the scheduler implementing CE-1 protocol.
        
        CE-1 Rules:
        1. Gate Atomic Budget: ΔE_gate ≤ E_alloc(p) × fraction_available
        2. Coherence Margin: ||c_vec_after|| ≥ c_min, else stabilize or abort
        3. Non-Dominance: No program exceeds threshold over T_avg
        4. Priority ordering: Process by (priority, earliest_ready_time)
        """
        tick_ledger = []
        gates_executed = []
        gates_deferred = []
        
        sorted_gates = sorted(
            self.pending_gates, 
            key=lambda g: (getattr(g, '_priority', 0), g.tick_scheduled)
        )
        
        for gate in sorted_gates:
            can_exec, reason = self.pool.can_execute_gate(gate, gate.program_id)
            if not can_exec:
                gates_deferred.append(gate)
                continue
            
            coherence_ok = True
            for mode_id in gate.target_modes:
                coh_ok, coh_msg = self.pool.check_coherence_margin(mode_id, gate.coherence_delta)
                if not coh_ok:
                    stabilizer = GateOperation(
                        gate_type=GateType.STABILIZER,
                        target_modes=[mode_id],
                        parameters={"tau": 0.01},
                        program_id=gate.program_id
                    )
                    stab_ok, reason = self.pool.can_execute_gate(stabilizer, gate.program_id)
                    if stab_ok:
                        self.executor.execute(stabilizer, self.modes)
                        self.pool.consume_energy(stabilizer.energy_cost, gate.program_id)
                        self.pool.update_mode_coherence(mode_id, stabilizer.coherence_delta)
                        coh_ok_after, _ = self.pool.check_coherence_margin(mode_id, gate.coherence_delta)
                        if not coh_ok_after:
                            coherence_ok = False
                            break
                    else:
                        coherence_ok = False
                        break
            
            if not coherence_ok:
                gates_deferred.append(gate)
                continue
            
            gate_strength = 1.0
            snr = self._estimate_snr(gate)
            if snr < 1.0:
                gate_strength = max(0.3, snr)
                if hasattr(gate.parameters, 'get'):
                    for key in ['theta', 'alpha', 'kappa', 'gradient', 'boost', 'delta_l']:
                        if key in gate.parameters:
                            gate.parameters[key] *= gate_strength
            
            success, updated_modes, msg = self.executor.execute(gate, self.modes)
            
            if success:
                self.modes = updated_modes
                self.pool.consume_energy(gate.energy_cost, gate.program_id)
                
                for mode_id in gate.target_modes:
                    self.pool.update_mode_coherence(mode_id, gate.coherence_delta)
                
                gate.tick_executed = self.pool.tick
                gate.success = True
                gates_executed.append(gate)
                
                entry = GateLedgerEntry(
                    program_id=gate.program_id,
                    gate_id=gate.gate_id,
                    gate_type=gate.gate_type.gate_id,
                    energy_used=gate.energy_cost,
                    coherence_delta=gate.coherence_delta,
                    tick=self.pool.tick,
                    success=True,
                    target_modes=gate.target_modes
                )
                self.ledger.append(entry)
                tick_ledger.append(entry)
            else:
                gates_deferred.append(gate)
        
        for gate in gates_executed:
            if gate in self.pending_gates:
                self.pending_gates.remove(gate)
            self.executed_gates.append(gate)
        
        self.pool.advance_tick()
        
        return tick_ledger
    
    def run_sequence(self, gates: List[GateOperation], program_id: str = "") -> Tuple[bool, List[GateLedgerEntry]]:
        """
        Run a full sequence of gates.
        
        Schedules all gates then executes ticks until complete or exhausted.
        """
        all_ledger = []
        
        for i, gate in enumerate(gates):
            gate.program_id = program_id or f"prog_{i}"
            success, msg = self.schedule_gate(gate, priority=i)
            if not success:
                return False, all_ledger
        
        max_ticks = len(gates) * 3
        tick_count = 0
        
        while self.pending_gates and tick_count < max_ticks:
            tick_ledger = self.execute_tick()
            all_ledger.extend(tick_ledger)
            tick_count += 1
        
        success = len(self.pending_gates) == 0
        return success, all_ledger
    
    def get_stats(self) -> Dict[str, Any]:
        """Get sequencer statistics."""
        return {
            "tick": self.pool.tick,
            "pending_gates": len(self.pending_gates),
            "executed_gates": len(self.executed_gates),
            "total_ledger_entries": len(self.ledger),
            "active_modes": len(self.modes),
            "pool": self.pool.to_dict(),
            "total_energy_consumed": sum(e.energy_used for e in self.ledger),
            "success_rate": len([e for e in self.ledger if e.success]) / len(self.ledger) if self.ledger else 1.0
        }


class LambdaGateSubstrate:
    """
    Lambda Gate Substrate v4 - Complete Implementation
    
    Extends the Lambda-Truth substrate with photonic gate operations.
    Integrates with SubstrateCoordinator for transaction validation.
    
    Master Equation:
    E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)
    
    Gate execution flow:
    1. Create Lambda modes
    2. Schedule gates via GateSequencer
    3. Execute with CE-1 coherence accounting
    4. Record to ledger for governance
    5. Optionally route through SubstrateCoordinator
    """
    
    VERSION = "4.0.0"
    
    def __init__(self, 
                 energy_pool: float = DEFAULT_ENERGY_POOL,
                 coherence_min: float = DEFAULT_COHERENCE_MIN,
                 coordinator: Optional[Any] = None):
        self.pool = CoherencePool(
            total_energy=energy_pool,
            remaining_energy=energy_pool,
            coherence_minimum=coherence_min
        )
        self.sequencer = GateSequencer(self.pool)
        self.coordinator = coordinator
        
        self.programs: Dict[str, List[GateOperation]] = {}
        self.history: List[Dict[str, Any]] = []
        
        self._init_v3_compatibility()
    
    def _init_v3_compatibility(self):
        """Initialize v3 backward compatibility layer."""
        self.reality_states: List[Any] = []
        self.total_lambda_created = 0.0
        self.total_lambda_destroyed = 0.0
    
    def create_mode(self, 
                    frequency: float,
                    amplitude: complex = 1.0 + 0j,
                    phase: float = 0.0,
                    oam_index: int = 0,
                    spin: int = 0) -> LambdaMode:
        """
        Create a new Lambda mode and register it.
        
        |λ⟩ = (ν, A(t), φ(t), ℓ, s)
        """
        mode = LambdaMode(
            frequency=frequency,
            amplitude=amplitude,
            phase=phase,
            oam_index=oam_index,
            spin=spin,
            creation_tick=self.pool.tick
        )
        self.sequencer.register_mode(mode)
        self.total_lambda_created += mode.lambda_mass
        
        self.history.append({
            "event": "create_mode",
            "time": time.time(),
            "mode_id": mode.mode_id,
            "frequency": frequency,
            "lambda_mass": mode.lambda_mass
        })
        
        return mode
    
    def phase_shift(self, mode_ids: List[str], theta: float) -> GateOperation:
        """Create a Phase-Shift gate: Φ(θ)"""
        return GateOperation(
            gate_type=GateType.PHASE_SHIFT,
            target_modes=mode_ids,
            parameters={"theta": theta}
        )
    
    def gain(self, mode_ids: List[str], alpha: float) -> GateOperation:
        """Create a Gain gate: G(α)"""
        return GateOperation(
            gate_type=GateType.GAIN,
            target_modes=mode_ids,
            parameters={"alpha": alpha}
        )
    
    def mode_mixer(self, mode1_id: str, mode2_id: str, kappa: float) -> GateOperation:
        """Create a Mode-Mixer gate: M(κ)"""
        return GateOperation(
            gate_type=GateType.MODE_MIXER,
            target_modes=[mode1_id, mode2_id],
            parameters={"kappa": kappa}
        )
    
    def oam_rotor(self, mode_ids: List[str], delta_l: int) -> GateOperation:
        """Create an OAM-Rotor gate: L(Δℓ)"""
        return GateOperation(
            gate_type=GateType.OAM_ROTOR,
            target_modes=mode_ids,
            parameters={"delta_l": delta_l}
        )
    
    def phase_gradient(self, mode_ids: List[str], gradient: float) -> GateOperation:
        """Create a Phase-Gradient gate: ∇Φ"""
        return GateOperation(
            gate_type=GateType.PHASE_GRADIENT,
            target_modes=mode_ids,
            parameters={"gradient": gradient}
        )
    
    def density_swap(self, mode1_id: str, mode2_id: str, alpha: float = 0.5) -> GateOperation:
        """Create a Density-Swap gate: S(α)"""
        return GateOperation(
            gate_type=GateType.DENSITY_SWAP,
            target_modes=[mode1_id, mode2_id],
            parameters={"alpha": alpha}
        )
    
    def coherence_amplify(self, mode_ids: List[str], boost: float = 0.1) -> GateOperation:
        """Create a Coherence-Amplify gate: A_c"""
        return GateOperation(
            gate_type=GateType.COHERENCE_AMPLIFY,
            target_modes=mode_ids,
            parameters={"boost": boost}
        )
    
    def stabilizer(self, mode_ids: List[str], tau: float = 0.01) -> GateOperation:
        """Create a Stabilizer gate: D(τ)"""
        return GateOperation(
            gate_type=GateType.STABILIZER,
            target_modes=mode_ids,
            parameters={"tau": tau}
        )
    
    def conditional_swap(self, 
                         mode1_id: str, 
                         mode2_id: str, 
                         threshold: float = 0.5) -> List[GateOperation]:
        """
        Conditional Swap: C-S(A, B, threshold)
        
        If |A| > threshold, swap portions of A,B.
        Basis for conditional branching in λ-programs.
        """
        mode1 = self.sequencer.modes.get(mode1_id)
        if not mode1:
            return []
        
        if abs(mode1.amplitude) > threshold:
            return [self.density_swap(mode1_id, mode2_id, 0.5)]
        return []
    
    def execute_program(self, 
                        gates: List[GateOperation], 
                        program_id: str = "") -> Tuple[bool, Dict[str, Any]]:
        """
        Execute a Lambda program (sequence of gates).
        
        Returns (success, result_dict)
        """
        if not program_id:
            program_id = f"prog_{hashlib.sha256(str(time.time()).encode()).hexdigest()[:8]}"
        
        self.programs[program_id] = gates
        
        success, ledger = self.sequencer.run_sequence(gates, program_id)
        
        if self.coordinator:
            self._record_to_coordinator(program_id, ledger)
        
        result = {
            "program_id": program_id,
            "success": success,
            "gates_executed": len(ledger),
            "total_energy": sum(e.energy_used for e in ledger),
            "ledger": [e.to_dict() for e in ledger],
            "final_modes": {mid: m.to_dict() for mid, m in self.sequencer.modes.items()}
        }
        
        self.history.append({
            "event": "execute_program",
            "time": time.time(),
            "program_id": program_id,
            "success": success,
            "n_gates": len(gates)
        })
        
        return success, result
    
    def _record_to_coordinator(self, program_id: str, ledger: List[GateLedgerEntry]):
        """Record gate execution to SubstrateCoordinator."""
        if not self.coordinator:
            return
        
        total_energy = sum(e.energy_used for e in ledger)
        
        try:
            if hasattr(self.coordinator, 'process_message_send'):
                self.coordinator.process_message_send(
                    sender=program_id,
                    recipient="LAMBDA_GATE_NETWORK",
                    message_bytes=int(total_energy * 1e30),
                    frequency_hz=6e14
                )
        except Exception:
            pass
    
    def validate_master_equation(self, mode: LambdaMode, information_bits: float = 1.0) -> Tuple[bool, Dict[str, Any]]:
        """
        Validate the Lambda Master Equation for a mode.
        
        E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)
        """
        E_available = mode.energy
        
        info_cost = PLANCK_CONSTANT * mode.frequency * information_bits
        curvature_cost = ALPHA_CURVATURE * mode.phase_curvature**2
        orbital_cost = BETA_ORBITAL * mode.orbital_complexity
        
        E_required = info_cost + curvature_cost + orbital_cost
        
        is_valid = E_available >= E_required
        
        return is_valid, {
            "mode_id": mode.mode_id,
            "E_available_j": E_available,
            "E_required_j": E_required,
            "info_cost_j": info_cost,
            "curvature_cost_j": curvature_cost,
            "orbital_cost_j": orbital_cost,
            "surplus_j": E_available - E_required,
            "valid": is_valid
        }
    
    def get_mode(self, mode_id: str) -> Optional[LambdaMode]:
        """Get a Lambda mode by ID."""
        return self.sequencer.modes.get(mode_id)
    
    def get_all_modes(self) -> Dict[str, LambdaMode]:
        """Get all registered Lambda modes."""
        return self.sequencer.modes.copy()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get substrate statistics."""
        return {
            "version": self.VERSION,
            "tick": self.pool.tick,
            "n_modes": len(self.sequencer.modes),
            "n_programs": len(self.programs),
            "total_lambda_created": self.total_lambda_created,
            "sequencer": self.sequencer.get_stats(),
            "pool": self.pool.to_dict(),
            "n_history_events": len(self.history)
        }
    
    def get_ledger(self) -> List[Dict[str, Any]]:
        """Get the full audit ledger."""
        return [e.to_dict() for e in self.sequencer.ledger]
    
    def reset(self):
        """Reset the substrate to initial state."""
        self.pool = CoherencePool(
            total_energy=self.pool.total_energy,
            remaining_energy=self.pool.total_energy,
            coherence_minimum=self.pool.coherence_minimum
        )
        self.sequencer = GateSequencer(self.pool)
        self.programs.clear()
        self.history.clear()
        self.total_lambda_created = 0.0
        self.total_lambda_destroyed = 0.0


_global_substrate = None

def get_lambda_gate_substrate(**kwargs) -> LambdaGateSubstrate:
    """Get the global Lambda Gate substrate instance."""
    global _global_substrate
    if _global_substrate is None:
        _global_substrate = LambdaGateSubstrate(**kwargs)
    return _global_substrate


def demo_lambda_gates():
    """
    Demonstration of Lambda Gate operations.
    
    Creates modes, executes gates, validates master equation.
    """
    substrate = LambdaGateSubstrate(energy_pool=1e-14)
    
    mode1 = substrate.create_mode(
        frequency=5e14,
        amplitude=1.0 + 0j,
        phase=0.0,
        oam_index=0
    )
    
    mode2 = substrate.create_mode(
        frequency=5.5e14,
        amplitude=0.7 + 0.3j,
        phase=math.pi / 4,
        oam_index=1
    )
    
    program = [
        substrate.phase_shift([mode1.mode_id], math.pi / 2),
        substrate.oam_rotor([mode1.mode_id], 2),
        substrate.mode_mixer(mode1.mode_id, mode2.mode_id, math.pi / 4),
        substrate.phase_gradient([mode1.mode_id, mode2.mode_id], 0.05),
        substrate.coherence_amplify([mode1.mode_id], 0.1),
        substrate.stabilizer([mode2.mode_id], 0.02),
    ]
    
    success, result = substrate.execute_program(program, "demo_program")
    
    m1 = substrate.get_mode(mode1.mode_id)
    m2 = substrate.get_mode(mode2.mode_id)
    
    valid1, valid2 = False, False
    if m1:
        valid1, eq1 = substrate.validate_master_equation(m1)
    if m2:
        valid2, eq2 = substrate.validate_master_equation(m2)
    
    print("=== Lambda Gate Substrate v4 Demo ===")
    print(f"\nProgram execution: {'SUCCESS' if success else 'FAILED'}")
    print(f"Gates executed: {result['gates_executed']}")
    print(f"Total energy used: {result['total_energy']:.2e} J")
    
    print("\n--- Mode 1 ---")
    if m1:
        print(f"Frequency: {m1.frequency:.2e} Hz")
        print(f"OAM index: {m1.oam_index}")
        print(f"Coherence: {m1.coherence:.4f}")
        print(f"Master equation valid: {valid1}")
    
    print("\n--- Mode 2 ---")
    if m2:
        print(f"Frequency: {m2.frequency:.2e} Hz")
        print(f"OAM index: {m2.oam_index}")
        print(f"Coherence: {m2.coherence:.4f}")
        print(f"Master equation valid: {valid2}")
    
    print("\n--- Substrate Stats ---")
    stats = substrate.get_stats()
    print(f"Tick: {stats['tick']}")
    print(f"Pool utilization: {stats['pool']['utilization_pct']:.1f}%")
    print(f"Ledger entries: {len(substrate.get_ledger())}")
    
    return substrate


if __name__ == "__main__":
    demo_lambda_gates()
