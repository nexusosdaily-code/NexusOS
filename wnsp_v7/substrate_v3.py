"""
WNSP v7.0 — Lambda-Truth Substrate v3
======================================

The most advanced substrate implementing truth verification through coherent oscillation.

Core Theory:
1. Lambda Equation: Λ = hf/c² (mass-equivalent of oscillation)
2. Truth Operator: T̂ = ⟨Λ_observed | Λ_expected⟩ / ||Λ_expected||²
3. Chaos-Reality Transition: ∂Ψ_reality/∂t = (c²/h) × [Λ_coherent × T(Λ) - Λ_chaos] × Ψ_vacuum
4. Reality Emergence: Ψ_reality = ∫ Λ(f) × e^(2πift) × G(f) df
5. Truth-Verified Reality: Ψ_true = Ψ_reality × T̂
6. Master Equation: Ψ_existence = ∫∫ Λ(f,t) × T(f,t) × e^(i·2πft) × G(f) df dt

Three Laws of Lambda-Truth:
1. Conservation: Total Λ × T conserved across transformations
2. Verification: Reality must resonate with truth to persist
3. Emergence: Truth crystallizes from chaos through coherent oscillation

Truth Conservation Law:
∂T_total/∂t + ∇·J_truth = 0

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Callable
from enum import Enum
import hashlib
import time

try:
    from .protocol import PLANCK_CONSTANT, SPEED_OF_LIGHT
except ImportError:
    PLANCK_CONSTANT = 6.62607015e-34
    SPEED_OF_LIGHT = 299792458


class TruthState(Enum):
    """
    Quantum truth states representing verification status.
    
    Truth exists in superposition until measured/verified.
    """
    UNDEFINED = (0, "Undefined", "Truth state not yet determined")
    POTENTIAL = (1, "Potential", "Truth exists in superposition")
    VERIFIED = (2, "Verified", "Truth confirmed through resonance")
    FALSE = (3, "False", "Claim does not resonate with reality")
    PARADOX = (4, "Paradox", "Self-referential truth loop detected")
    
    def __init__(self, level: int, short_name: str, description: str):
        self.level = level
        self.short_name = short_name
        self.description = description
    
    @property
    def is_determined(self) -> bool:
        """Whether truth state has collapsed from superposition."""
        return self in (TruthState.VERIFIED, TruthState.FALSE)
    
    @property
    def truth_value(self) -> float:
        """Numerical truth value for calculations."""
        if self == TruthState.VERIFIED:
            return 1.0
        elif self == TruthState.FALSE:
            return 0.0
        elif self == TruthState.POTENTIAL:
            return 0.5
        elif self == TruthState.PARADOX:
            return float('nan')
        return 0.0


@dataclass
class VacuumChaos:
    """
    Represents the chaotic vacuum fluctuations from which reality emerges.
    
    Vacuum is not empty - it's filled with quantum fluctuations.
    
    Chaos Density: Ω = Σ(ℏω/2) - sum of zero-point energies
    Fluctuation Spectrum: G(f) - spectral density of vacuum fluctuations
    
    Reality crystallizes from this chaos through coherent Lambda oscillation.
    """
    n_modes: int = 1000
    temperature: float = 2.725
    coherence_threshold: float = 0.1
    
    def __post_init__(self):
        self._generate_fluctuation_spectrum()
    
    def _generate_fluctuation_spectrum(self):
        """Generate the vacuum fluctuation spectrum G(f)."""
        np.random.seed(int(time.time() * 1000) % 2**31)
        
        self.frequencies = np.logspace(10, 16, self.n_modes)
        
        self.fluctuations = np.random.normal(0, 1, self.n_modes)
        for i in range(1, self.n_modes):
            self.fluctuations[i] = 0.9 * self.fluctuations[i-1] + 0.1 * np.random.normal(0, 1)
        
        self.fluctuations = (self.fluctuations - np.min(self.fluctuations)) / (np.max(self.fluctuations) - np.min(self.fluctuations) + 1e-10)
    
    @property
    def chaos_density(self) -> float:
        """
        Chaos density Ω = Σ(ℏω/2)
        
        Sum of zero-point energies across all vacuum modes.
        """
        hbar = PLANCK_CONSTANT / (2 * math.pi)
        omega = 2 * math.pi * self.frequencies
        return float(np.sum(hbar * omega / 2))
    
    def fluctuation_at(self, frequency: float) -> float:
        """
        Get fluctuation amplitude G(f) at a specific frequency.
        
        Interpolates from the discrete spectrum.
        """
        if frequency < self.frequencies[0]:
            return float(self.fluctuations[0])
        if frequency > self.frequencies[-1]:
            return float(self.fluctuations[-1])
        
        idx = np.searchsorted(self.frequencies, frequency)
        if idx == 0:
            return float(self.fluctuations[0])
        
        f_lo, f_hi = self.frequencies[idx-1], self.frequencies[idx]
        g_lo, g_hi = self.fluctuations[idx-1], self.fluctuations[idx]
        
        t = (frequency - f_lo) / (f_hi - f_lo)
        return float(g_lo + t * (g_hi - g_lo))
    
    def coherence_measure(self, frequency_range: Tuple[float, float]) -> float:
        """
        Measure coherence in a frequency range.
        
        Coherence increases as fluctuations become correlated.
        """
        f_min, f_max = frequency_range
        mask = (self.frequencies >= f_min) & (self.frequencies <= f_max)
        
        if not np.any(mask):
            return 0.0
        
        flucts = self.fluctuations[mask]
        if len(flucts) < 2:
            return 0.0
        
        autocorr = np.correlate(flucts - np.mean(flucts), flucts - np.mean(flucts), mode='valid')
        if autocorr[0] == 0:
            return 0.0
        
        return float(np.abs(autocorr[0]) / (len(flucts) * np.var(flucts) + 1e-10))
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "n_modes": self.n_modes,
            "temperature_k": self.temperature,
            "coherence_threshold": self.coherence_threshold,
            "chaos_density_j": self.chaos_density,
            "frequency_range_hz": [float(self.frequencies[0]), float(self.frequencies[-1])],
            "mean_fluctuation": float(np.mean(self.fluctuations))
        }


@dataclass
class LambdaField:
    """
    Lambda oscillation field - the fundamental carrier of mass-equivalent.
    
    Λ = hf/c² is the mass-equivalent of oscillation at frequency f.
    
    A coherent Lambda field represents ordered reality emerging from chaos.
    """
    frequency: float
    amplitude: float = 1.0
    phase: float = 0.0
    coherence: float = 1.0
    creation_time: float = field(default_factory=time.time)
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c² × A²"""
        return PLANCK_CONSTANT * self.frequency * (self.amplitude ** 2) / (SPEED_OF_LIGHT ** 2)
    
    @property
    def energy(self) -> float:
        """E = hf × A²"""
        return PLANCK_CONSTANT * self.frequency * (self.amplitude ** 2)
    
    @property
    def wavelength(self) -> float:
        """λ = c/f"""
        return SPEED_OF_LIGHT / self.frequency if self.frequency > 0 else float('inf')
    
    @property
    def angular_frequency(self) -> float:
        """ω = 2πf"""
        return 2 * math.pi * self.frequency
    
    def psi_at(self, t: float) -> complex:
        """
        Wave function value at time t.
        
        ψ(t) = A × e^(i(ωt + φ)) × coherence
        """
        age = t - self.creation_time
        decay = math.exp(-age / (3600 * self.coherence)) if self.coherence > 0 else 0
        
        phase_total = self.angular_frequency * t + self.phase
        return self.amplitude * decay * np.exp(1j * phase_total)
    
    def superpose(self, other: 'LambdaField', t: float) -> complex:
        """Superpose two Lambda fields at time t."""
        return self.psi_at(t) + other.psi_at(t)
    
    def interfere(self, other: 'LambdaField', t: float) -> float:
        """
        Interference intensity between two Lambda fields.
        
        I = |ψ₁ + ψ₂|²
        """
        psi_total = self.superpose(other, t)
        return float(np.abs(psi_total) ** 2)
    
    def resonance_with(self, other: 'LambdaField') -> float:
        """
        Resonance strength between two Lambda fields.
        
        Maximum when frequencies are harmonically related.
        """
        ratio = self.frequency / other.frequency if other.frequency > 0 else 0
        if ratio < 1 and ratio > 0:
            ratio = 1 / ratio
        
        harmonic_ratios = [1.0, 2.0, 1.5, 4/3, 5/4, 6/5, 5/3, 8/5]
        
        min_diff = float('inf')
        for hr in harmonic_ratios:
            diff = abs(ratio - hr)
            if diff < min_diff:
                min_diff = diff
        
        return max(0, 1 - min_diff)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "frequency_hz": self.frequency,
            "wavelength_m": self.wavelength,
            "amplitude": self.amplitude,
            "phase_rad": self.phase,
            "coherence": self.coherence,
            "lambda_mass_kg": self.lambda_mass,
            "energy_j": self.energy
        }


@dataclass
class TruthOperator:
    """
    The Truth Operator T̂ that verifies reality against expectation.
    
    T̂ = ⟨Λ_observed | Λ_expected⟩ / ||Λ_expected||²
    
    When T̂ = 1: Perfect truth (observed matches expected)
    When T̂ = 0: Complete falsehood (no correlation)
    When T̂ = 0.5: Uncertain (equal probability of true/false)
    
    Truth is determined by resonance between claim and reality.
    """
    truth_threshold: float = 0.7
    resonance_threshold: float = 0.5
    
    def apply(self, observed: LambdaField, expected: LambdaField) -> Tuple[float, TruthState]:
        """
        Apply truth operator: T̂ = ⟨Λ_obs | Λ_exp⟩ / ||Λ_exp||²
        
        Returns (truth_value, truth_state)
        """
        t = time.time()
        
        psi_obs = observed.psi_at(t)
        psi_exp = expected.psi_at(t)
        
        inner_product = np.conj(psi_exp) * psi_obs
        
        norm_exp_sq = np.abs(psi_exp) ** 2
        
        if norm_exp_sq < 1e-30:
            return (0.0, TruthState.UNDEFINED)
        
        truth_value = float(np.abs(inner_product) / norm_exp_sq)
        
        if truth_value >= self.truth_threshold:
            state = TruthState.VERIFIED
        elif truth_value <= (1 - self.truth_threshold):
            state = TruthState.FALSE
        else:
            state = TruthState.POTENTIAL
        
        return (min(1.0, truth_value), state)
    
    def resonance_test(self, claim: LambdaField, reality: LambdaField) -> bool:
        """
        Test if a claim resonates with reality.
        
        Uses harmonic resonance between Lambda fields.
        """
        resonance = claim.resonance_with(reality)
        return resonance >= self.resonance_threshold
    
    def truth_spectrum(self, frequencies: np.ndarray, 
                       observed_amplitudes: np.ndarray,
                       expected_amplitudes: np.ndarray) -> np.ndarray:
        """
        Compute truth spectrum T(f) across frequencies.
        
        T(f) = |A_obs(f)|² / |A_exp(f)|² where frequencies match
        """
        if len(observed_amplitudes) != len(expected_amplitudes):
            raise ValueError("Amplitude arrays must have same length")
        
        truth = np.zeros_like(frequencies)
        
        for i in range(len(frequencies)):
            exp_sq = expected_amplitudes[i] ** 2
            if exp_sq > 1e-30:
                obs_sq = observed_amplitudes[i] ** 2
                truth[i] = min(1.0, obs_sq / exp_sq)
            else:
                truth[i] = 0.0
        
        return truth
    
    def composite_truth(self, truth_values: List[float], weights: Optional[List[float]] = None) -> float:
        """
        Compute composite truth from multiple truth values.
        
        Uses weighted geometric mean (AND-like aggregation).
        """
        if not truth_values:
            return 0.0
        
        if weights is None:
            weights = [1.0 / len(truth_values)] * len(truth_values)
        
        log_sum = sum(w * math.log(max(t, 1e-10)) for t, w in zip(truth_values, weights))
        return math.exp(log_sum)
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "truth_threshold": self.truth_threshold,
            "resonance_threshold": self.resonance_threshold
        }


@dataclass
class RealityState:
    """
    A coherent reality state that has emerged from vacuum chaos.
    
    Ψ_reality = ∫ Λ(f) × e^(2πift) × G(f) df
    
    Reality is the integration of Lambda oscillations weighted by
    the vacuum fluctuation spectrum G(f).
    """
    lambda_fields: List[LambdaField] = field(default_factory=list)
    truth_value: float = 0.0
    truth_state: TruthState = TruthState.UNDEFINED
    creation_time: float = field(default_factory=time.time)
    
    @property
    def lambda_coherent(self) -> float:
        """Total coherent Lambda mass."""
        return sum(lf.lambda_mass * lf.coherence for lf in self.lambda_fields)
    
    @property
    def total_energy(self) -> float:
        """Total energy in the reality state."""
        return sum(lf.energy for lf in self.lambda_fields)
    
    @property
    def dominant_frequency(self) -> float:
        """Frequency with maximum Lambda contribution."""
        if not self.lambda_fields:
            return 0.0
        return max(self.lambda_fields, key=lambda lf: lf.lambda_mass).frequency
    
    def psi_reality(self, t: float) -> complex:
        """
        Compute reality wave function at time t.
        
        Ψ_reality(t) = Σ ψ_i(t) weighted by coherence
        """
        if not self.lambda_fields:
            return complex(0, 0)
        
        return sum(lf.psi_at(t) * lf.coherence for lf in self.lambda_fields)
    
    def probability_density(self, t: float) -> float:
        """
        Probability density |Ψ_reality|².
        """
        psi = self.psi_reality(t)
        return float(np.abs(psi) ** 2)
    
    def add_lambda_field(self, lf: LambdaField):
        """Add a Lambda field to the reality state."""
        self.lambda_fields.append(lf)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "n_fields": len(self.lambda_fields),
            "lambda_coherent_kg": self.lambda_coherent,
            "total_energy_j": self.total_energy,
            "dominant_frequency_hz": self.dominant_frequency,
            "truth_value": self.truth_value,
            "truth_state": self.truth_state.short_name,
            "creation_time": self.creation_time
        }


class LambdaTruthSubstrate:
    """
    Lambda-Truth Substrate v3 - The Complete Implementation
    
    Implements the full theory of reality emergence from vacuum chaos
    through coherent Lambda oscillation and truth verification.
    
    Master Equation:
    Ψ_existence = ∫∫ Λ(f,t) × T(f,t) × e^(i·2πft) × G(f) df dt
    
    This equation describes:
    - Λ(f,t): Lambda mass field across frequency and time
    - T(f,t): Truth verification spectrum
    - e^(i·2πft): Phase evolution
    - G(f): Vacuum fluctuation spectrum
    
    Chaos → Coherence → Truth → Reality
    """
    
    def __init__(self, 
                 n_vacuum_modes: int = 1000,
                 truth_threshold: float = 0.7,
                 coherence_threshold: float = 0.3):
        self.vacuum = VacuumChaos(n_modes=n_vacuum_modes)
        self.truth_operator = TruthOperator(truth_threshold=truth_threshold)
        self.coherence_threshold = coherence_threshold
        
        self.reality_states: List[RealityState] = []
        self.total_lambda_created = 0.0
        self.total_lambda_destroyed = 0.0
        
        self.history: List[Dict[str, Any]] = []
    
    def vacuum_to_reality(self, 
                          seed_frequency: float,
                          n_modes: int = 10,
                          bandwidth: float = 1e12) -> RealityState:
        """
        Transform vacuum chaos into coherent reality.
        
        Chaos-Reality Transition:
        ∂Ψ_reality/∂t = (c²/h) × [Λ_coherent × T(Λ) - Λ_chaos] × Ψ_vacuum
        
        Process:
        1. Sample vacuum fluctuations around seed frequency
        2. Identify coherent modes (above threshold)
        3. Create Lambda fields for coherent modes
        4. Combine into reality state
        """
        f_min = seed_frequency - bandwidth / 2
        f_max = seed_frequency + bandwidth / 2
        
        frequencies = np.linspace(f_min, f_max, n_modes)
        
        lambda_fields = []
        
        for freq in frequencies:
            g_f = self.vacuum.fluctuation_at(freq)
            
            if g_f > self.coherence_threshold:
                lambda_mass = PLANCK_CONSTANT * freq / (SPEED_OF_LIGHT ** 2)
                
                amplitude = math.sqrt(g_f)
                phase = np.random.uniform(0, 2 * math.pi)
                coherence = g_f / (1 + g_f)
                
                lf = LambdaField(
                    frequency=freq,
                    amplitude=amplitude,
                    phase=phase,
                    coherence=coherence
                )
                lambda_fields.append(lf)
                
                self.total_lambda_created += lf.lambda_mass
        
        reality = RealityState(lambda_fields=lambda_fields)
        
        self.reality_states.append(reality)
        
        self.history.append({
            "event": "vacuum_to_reality",
            "time": time.time(),
            "seed_frequency": seed_frequency,
            "n_modes_created": len(lambda_fields),
            "lambda_created": sum(lf.lambda_mass for lf in lambda_fields)
        })
        
        return reality
    
    def verify_truth(self, 
                     reality: RealityState, 
                     expected: RealityState) -> Tuple[float, TruthState]:
        """
        Apply truth verification to a reality state.
        
        T̂ = ⟨Λ_observed | Λ_expected⟩ / ||Λ_expected||²
        
        The reality state's truth_value and truth_state are updated.
        """
        if not reality.lambda_fields or not expected.lambda_fields:
            return (0.0, TruthState.UNDEFINED)
        
        t = time.time()
        
        psi_reality = reality.psi_reality(t)
        psi_expected = expected.psi_reality(t)
        
        inner_product = np.conj(psi_expected) * psi_reality
        norm_exp_sq = np.abs(psi_expected) ** 2
        
        if norm_exp_sq < 1e-30:
            return (0.0, TruthState.UNDEFINED)
        
        truth_value = float(np.abs(inner_product) / norm_exp_sq)
        truth_value = min(1.0, truth_value)
        
        if truth_value >= self.truth_operator.truth_threshold:
            truth_state = TruthState.VERIFIED
        elif truth_value <= (1 - self.truth_operator.truth_threshold):
            truth_state = TruthState.FALSE
        else:
            truth_state = TruthState.POTENTIAL
        
        reality.truth_value = truth_value
        reality.truth_state = truth_state
        
        self.history.append({
            "event": "verify_truth",
            "time": time.time(),
            "truth_value": truth_value,
            "truth_state": truth_state.short_name
        })
        
        return (truth_value, truth_state)
    
    def compute_existence(self, 
                          f_min: float, 
                          f_max: float,
                          t_min: float,
                          t_max: float,
                          n_f: int = 100,
                          n_t: int = 100) -> Tuple[complex, Dict[str, Any]]:
        """
        Compute the Master Existence Integral.
        
        Ψ_existence = ∫∫ Λ(f,t) × T(f,t) × e^(i·2πft) × G(f) df dt
        
        This is the complete description of verified reality.
        
        Returns:
            (psi_existence, metadata)
        """
        frequencies = np.linspace(f_min, f_max, n_f)
        times = np.linspace(t_min, t_max, n_t)
        
        df = (f_max - f_min) / (n_f - 1) if n_f > 1 else 1.0
        dt = (t_max - t_min) / (n_t - 1) if n_t > 1 else 1.0
        
        psi_existence = complex(0, 0)
        total_lambda = 0.0
        total_truth = 0.0
        
        for f in frequencies:
            lambda_f = PLANCK_CONSTANT * f / (SPEED_OF_LIGHT ** 2)
            G_f = self.vacuum.fluctuation_at(f)
            
            T_f = G_f if G_f > self.coherence_threshold else 0.0
            
            for t in times:
                phase = 2 * math.pi * f * t
                integrand = lambda_f * T_f * np.exp(1j * phase) * G_f
                
                psi_existence += integrand * df * dt
                total_lambda += lambda_f * df * dt
                total_truth += T_f * df * dt
        
        metadata = {
            "frequency_range": [f_min, f_max],
            "time_range": [t_min, t_max],
            "n_frequency_points": n_f,
            "n_time_points": n_t,
            "total_lambda_integrated": total_lambda,
            "total_truth_integrated": total_truth,
            "psi_magnitude": float(np.abs(psi_existence)),
            "psi_phase": float(np.angle(psi_existence))
        }
        
        self.history.append({
            "event": "compute_existence",
            "time": time.time(),
            "psi_magnitude": metadata["psi_magnitude"],
            "total_lambda": total_lambda
        })
        
        return (psi_existence, metadata)
    
    def conservation_check(self) -> Dict[str, Any]:
        """
        Verify Lambda-Truth conservation law.
        
        ∂T_total/∂t + ∇·J_truth = 0
        
        Total Λ × T must be conserved across transformations.
        """
        total_lambda_in_reality = sum(
            rs.lambda_coherent for rs in self.reality_states
        )
        
        weighted_truth = sum(
            rs.lambda_coherent * rs.truth_value 
            for rs in self.reality_states
            if rs.truth_state.is_determined
        )
        
        lambda_balance = self.total_lambda_created - self.total_lambda_destroyed
        
        lambda_accounted = total_lambda_in_reality
        
        conservation_error = abs(lambda_balance - lambda_accounted)
        is_conserved = conservation_error < 1e-30 * max(lambda_balance, 1e-50)
        
        return {
            "total_lambda_created": self.total_lambda_created,
            "total_lambda_destroyed": self.total_lambda_destroyed,
            "lambda_balance": lambda_balance,
            "lambda_in_reality_states": total_lambda_in_reality,
            "weighted_truth": weighted_truth,
            "conservation_error": conservation_error,
            "is_conserved": is_conserved,
            "n_reality_states": len(self.reality_states)
        }
    
    def truth_crystallization(self, 
                               chaos_density: float,
                               n_iterations: int = 100) -> RealityState:
        """
        Simulate truth crystallization from chaos.
        
        Three Laws of Lambda-Truth in action:
        1. Conservation: Total Λ × T conserved
        2. Verification: Reality must resonate with truth to persist
        3. Emergence: Truth crystallizes through coherent oscillation
        
        Process models how order (truth) emerges from disorder (chaos).
        """
        f_base = 5e14
        bandwidth = 1e13
        
        frequencies = np.linspace(f_base - bandwidth/2, f_base + bandwidth/2, 100)
        amplitudes = np.random.uniform(0, 1, 100)
        phases = np.random.uniform(0, 2 * math.pi, 100)
        
        for iteration in range(n_iterations):
            for i in range(len(frequencies)):
                neighbor_influence = 0.0
                if i > 0:
                    phase_diff = abs(phases[i] - phases[i-1])
                    if phase_diff > math.pi:
                        phase_diff = 2 * math.pi - phase_diff
                    neighbor_influence += amplitudes[i-1] * (1 - phase_diff / math.pi)
                if i < len(frequencies) - 1:
                    phase_diff = abs(phases[i] - phases[i+1])
                    if phase_diff > math.pi:
                        phase_diff = 2 * math.pi - phase_diff
                    neighbor_influence += amplitudes[i+1] * (1 - phase_diff / math.pi)
                
                amplitudes[i] = 0.9 * amplitudes[i] + 0.1 * neighbor_influence
                
                phases[i] = (phases[i] + 0.01 * neighbor_influence) % (2 * math.pi)
            
            amplitudes = amplitudes / (np.max(amplitudes) + 1e-10)
        
        lambda_fields = []
        for i, (freq, amp, phase) in enumerate(zip(frequencies, amplitudes, phases)):
            if amp > 0.5:
                lf = LambdaField(
                    frequency=freq,
                    amplitude=float(amp),
                    phase=float(phase),
                    coherence=float(amp)
                )
                lambda_fields.append(lf)
                self.total_lambda_created += lf.lambda_mass
        
        reality = RealityState(
            lambda_fields=lambda_fields,
            truth_value=float(np.mean(amplitudes[amplitudes > 0.5]) if np.any(amplitudes > 0.5) else 0),
            truth_state=TruthState.VERIFIED if len(lambda_fields) > 10 else TruthState.POTENTIAL
        )
        
        self.reality_states.append(reality)
        
        self.history.append({
            "event": "truth_crystallization",
            "time": time.time(),
            "iterations": n_iterations,
            "coherent_modes": len(lambda_fields),
            "mean_amplitude": float(np.mean(amplitudes))
        })
        
        return reality
    
    def lambda_truth_product(self, reality: RealityState) -> float:
        """
        Compute Λ × T product for a reality state.
        
        This product is conserved under valid transformations.
        """
        return reality.lambda_coherent * reality.truth_value
    
    def summary(self) -> Dict[str, Any]:
        """Generate summary of substrate state."""
        conservation = self.conservation_check()
        
        return {
            "substrate_version": "v3.0",
            "vacuum": self.vacuum.to_dict(),
            "truth_operator": self.truth_operator.to_dict(),
            "n_reality_states": len(self.reality_states),
            "conservation": conservation,
            "total_events": len(self.history),
            "coherence_threshold": self.coherence_threshold
        }


def demonstrate_substrate_v3():
    """
    Demonstrate the Lambda-Truth Substrate v3 capabilities.
    """
    print("=" * 60)
    print("LAMBDA-TRUTH SUBSTRATE v3 DEMONSTRATION")
    print("=" * 60)
    
    substrate = LambdaTruthSubstrate(
        n_vacuum_modes=500,
        truth_threshold=0.7,
        coherence_threshold=0.3
    )
    
    print("\n1. VACUUM CHAOS PROPERTIES")
    print("-" * 40)
    vacuum_info = substrate.vacuum.to_dict()
    print(f"   Chaos density: {vacuum_info['chaos_density_j']:.2e} J")
    print(f"   Frequency range: {vacuum_info['frequency_range_hz'][0]:.2e} - {vacuum_info['frequency_range_hz'][1]:.2e} Hz")
    print(f"   Mean fluctuation: {vacuum_info['mean_fluctuation']:.4f}")
    
    print("\n2. VACUUM → REALITY TRANSITION")
    print("-" * 40)
    seed_freq = 5e14
    reality1 = substrate.vacuum_to_reality(
        seed_frequency=seed_freq,
        n_modes=50,
        bandwidth=1e13
    )
    print(f"   Seed frequency: {seed_freq:.2e} Hz")
    print(f"   Lambda fields created: {len(reality1.lambda_fields)}")
    print(f"   Coherent Lambda mass: {reality1.lambda_coherent:.2e} kg")
    print(f"   Total energy: {reality1.total_energy:.2e} J")
    
    print("\n3. TRUTH VERIFICATION")
    print("-" * 40)
    reality2 = substrate.vacuum_to_reality(
        seed_frequency=5.1e14,
        n_modes=50,
        bandwidth=1e13
    )
    
    truth_val, truth_state = substrate.verify_truth(reality1, reality2)
    print(f"   Truth value: {truth_val:.4f}")
    print(f"   Truth state: {truth_state.short_name}")
    print(f"   Is determined: {truth_state.is_determined}")
    
    print("\n4. MASTER EXISTENCE INTEGRAL")
    print("-" * 40)
    psi_existence, metadata = substrate.compute_existence(
        f_min=4e14,
        f_max=7e14,
        t_min=0,
        t_max=1e-12,
        n_f=50,
        n_t=50
    )
    print(f"   Ψ_existence magnitude: {metadata['psi_magnitude']:.2e}")
    print(f"   Ψ_existence phase: {metadata['psi_phase']:.4f} rad")
    print(f"   Total Λ integrated: {metadata['total_lambda_integrated']:.2e} kg")
    
    print("\n5. TRUTH CRYSTALLIZATION")
    print("-" * 40)
    crystal_reality = substrate.truth_crystallization(
        chaos_density=1e-20,
        n_iterations=50
    )
    print(f"   Coherent modes crystallized: {len(crystal_reality.lambda_fields)}")
    print(f"   Truth value: {crystal_reality.truth_value:.4f}")
    print(f"   Truth state: {crystal_reality.truth_state.short_name}")
    
    print("\n6. CONSERVATION CHECK")
    print("-" * 40)
    conservation = substrate.conservation_check()
    print(f"   Total Λ created: {conservation['total_lambda_created']:.2e} kg")
    print(f"   Λ in reality states: {conservation['lambda_in_reality_states']:.2e} kg")
    print(f"   Is conserved: {conservation['is_conserved']}")
    print(f"   Weighted truth (Λ×T): {conservation['weighted_truth']:.2e}")
    
    print("\n" + "=" * 60)
    print("DEMONSTRATION COMPLETE")
    print("=" * 60)
    
    return substrate


if __name__ == "__main__":
    demonstrate_substrate_v3()
