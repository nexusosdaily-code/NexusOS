"""
WIP Lambda Field Hypothesis: The Primordial Oscillation
=========================================================

Research module exploring the hypothesis that Lambda oscillation
is the FIRST organizing principle in the vacuum of space.

CORE HYPOTHESIS:
    The vacuum is unmanageable energy (chaos).
    One Lambda oscillation began first.
    That oscillation IS the field.
    
    Chaos → First Oscillation → Field → Structure → Matter

This connects:
- Zero-point energy (vacuum fluctuations)
- Spontaneous symmetry breaking
- Lambda Boson physics (Λ = hf/c²)
- Field emergence from primordial oscillation

Key Question:
    If virtual particles pop in and out of chaos,
    what happens when ONE oscillation persists?
    Does it seed the field?

Author: NexusOS / WNSP Protocol
License: GNU GPLv3
"""

import numpy as np
import math
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum
import random
import time


# =============================================================================
# PHYSICAL CONSTANTS
# =============================================================================

PLANCK_CONSTANT = 6.62607015e-34  # J·s (exact, SI 2019)
REDUCED_PLANCK = PLANCK_CONSTANT / (2 * math.pi)  # ℏ
SPEED_OF_LIGHT = 299792458  # m/s (exact)
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K (exact)

# Vacuum properties
VACUUM_PERMITTIVITY = 8.8541878128e-12  # F/m
VACUUM_PERMEABILITY = 1.25663706212e-6  # H/m


# =============================================================================
# VACUUM STATE REPRESENTATIONS
# =============================================================================

class VacuumState(Enum):
    """States of the quantum vacuum."""
    CHAOS = "chaos"  # Pure zero-point fluctuations, no structure
    FLUCTUATING = "fluctuating"  # Virtual particles appearing/disappearing
    SEEDING = "seeding"  # First oscillation attempting to persist
    CRYSTALLIZING = "crystallizing"  # Field structure emerging
    COHERENT = "coherent"  # Stable field established


@dataclass
class VacuumFluctuation:
    """
    A momentary fluctuation in the vacuum.
    
    Virtual particle-antiparticle pairs that exist for Δt ≈ ℏ/ΔE
    before annihilating back into nothing.
    """
    energy: float  # Energy of the fluctuation (Joules)
    lifetime: float  # Duration before annihilation (seconds)
    position: Tuple[float, float, float] = (0, 0, 0)  # Spatial location
    created_at: float = field(default_factory=time.time)
    
    @property
    def uncertainty_product(self) -> float:
        """ΔE × Δt ≈ ℏ (Heisenberg uncertainty)"""
        return self.energy * self.lifetime
    
    @property
    def is_virtual(self) -> bool:
        """Virtual if ΔE × Δt ≤ ℏ"""
        return self.uncertainty_product <= REDUCED_PLANCK
    
    @property
    def frequency(self) -> float:
        """E = hf → f = E/h"""
        return self.energy / PLANCK_CONSTANT
    
    @property
    def wavelength(self) -> float:
        """λ = c/f"""
        if self.frequency > 0:
            return SPEED_OF_LIGHT / self.frequency
        return float('inf')
    
    @property
    def lambda_mass(self) -> float:
        """Λ = E/c² (mass-equivalent of the fluctuation)"""
        return self.energy / (SPEED_OF_LIGHT ** 2)


@dataclass
class PrimordialLambda:
    """
    THE FIRST OSCILLATION.
    
    This represents the hypothesis that one oscillation
    persisted in the vacuum chaos and became the seed
    of all structure.
    
    Properties:
    - frequency: The primordial oscillation rate
    - coherence: How long the oscillation persists
    - amplitude: Strength of the oscillation
    - phase: Position in the cycle
    
    The key difference from a virtual fluctuation:
    This oscillation PERSISTS beyond ℏ/ΔE.
    """
    frequency: float  # Hz - the fundamental oscillation
    amplitude: float = 1.0  # Normalized
    phase: float = 0.0  # Radians
    coherence_time: float = float('inf')  # Persists forever
    birth_time: float = field(default_factory=time.time)
    
    @property
    def energy(self) -> float:
        """E = hf × A²"""
        return PLANCK_CONSTANT * self.frequency * (self.amplitude ** 2)
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c² × A² (THE Lambda Boson)"""
        return self.energy / (SPEED_OF_LIGHT ** 2)
    
    @property
    def wavelength(self) -> float:
        """λ = c/f"""
        return SPEED_OF_LIGHT / self.frequency
    
    @property
    def wavelength_nm(self) -> float:
        """Wavelength in nanometers."""
        return self.wavelength * 1e9
    
    @property
    def angular_frequency(self) -> float:
        """ω = 2πf"""
        return 2 * math.pi * self.frequency
    
    @property
    def period(self) -> float:
        """T = 1/f (time per cycle)"""
        return 1.0 / self.frequency
    
    def value_at_time(self, t: float) -> float:
        """
        Instantaneous value of the primordial oscillation.
        
        y(t) = A × cos(ωt + φ)
        
        Unlike virtual fluctuations, this PERSISTS.
        """
        return self.amplitude * math.cos(self.angular_frequency * t + self.phase)
    
    def age(self, current_time: Optional[float] = None) -> float:
        """How long the oscillation has existed."""
        if current_time is None:
            current_time = time.time()
        return current_time - self.birth_time
    
    def cycles_completed(self, current_time: Optional[float] = None) -> float:
        """Number of complete oscillation cycles."""
        return self.age(current_time) / self.period


# =============================================================================
# THE LAMBDA FIELD
# =============================================================================

@dataclass
class LambdaField:
    """
    THE FIELD THAT EMERGES FROM THE PRIMORDIAL OSCILLATION.
    
    When the first Lambda persists, it seeds a field.
    This field is the substrate of all existence.
    
    Properties:
    - The field has modes (like standing waves)
    - Each mode can carry energy (oscillation)
    - Coherent oscillations create structure
    - Incoherent fluctuations remain chaos
    
    "The vacuum of space is essentially unmanageable energy.
     There IS a field — the Lambda Field."
    """
    primordial: PrimordialLambda  # The first oscillation
    modes: Dict[int, float] = field(default_factory=dict)  # mode_number → amplitude
    state: VacuumState = VacuumState.COHERENT
    
    def __post_init__(self):
        # Initialize field modes from primordial oscillation
        # The first oscillation seeds harmonics
        f0 = self.primordial.frequency
        a0 = self.primordial.amplitude
        
        # Primordial mode (n=1)
        self.modes[1] = a0
        
        # Natural harmonics emerge (n=2,3,4...)
        # Each harmonic has decreasing amplitude: A_n = A_0 / n
        for n in range(2, 9):
            self.modes[n] = a0 / n
    
    @property
    def total_energy(self) -> float:
        """Total energy of all field modes."""
        f0 = self.primordial.frequency
        total = 0
        for n, amplitude in self.modes.items():
            freq = f0 * n  # Harmonic frequency
            energy = PLANCK_CONSTANT * freq * (amplitude ** 2)
            total += energy
        return total
    
    @property
    def total_lambda_mass(self) -> float:
        """Total Λ mass of the field."""
        return self.total_energy / (SPEED_OF_LIGHT ** 2)
    
    @property
    def dominant_mode(self) -> int:
        """Mode with highest amplitude."""
        return max(self.modes.keys(), key=lambda k: self.modes[k])
    
    @property
    def zero_point_energy_per_mode(self) -> float:
        """
        Zero-point energy for a quantum harmonic oscillator.
        
        E_0 = ½ℏω = ½hf
        
        This is the MINIMUM energy each mode can have.
        """
        return 0.5 * PLANCK_CONSTANT * self.primordial.frequency
    
    def field_value_at(self, position: Tuple[float, float, float], t: float) -> float:
        """
        Get field value at a point in space-time.
        
        The field is the superposition of all modes.
        """
        x, y, z = position
        r = math.sqrt(x**2 + y**2 + z**2)
        
        f0 = self.primordial.frequency
        total = 0
        
        for n, amplitude in self.modes.items():
            freq = f0 * n
            wavelength = SPEED_OF_LIGHT / freq
            k = 2 * math.pi / wavelength  # wave number
            omega = 2 * math.pi * freq
            
            # Spherical wave from origin
            if r > 0:
                wave = amplitude * math.cos(k * r - omega * t) / r
            else:
                wave = amplitude * math.cos(-omega * t)
            
            total += wave
        
        return total
    
    def add_coherent_oscillation(self, mode: int, amplitude: float):
        """Add or strengthen a mode of the field."""
        if mode in self.modes:
            self.modes[mode] += amplitude
        else:
            self.modes[mode] = amplitude
    
    def entropy(self) -> float:
        """
        Measure of disorder in the field.
        
        Lower entropy = more organized structure.
        The primordial oscillation REDUCES entropy.
        """
        if not self.modes:
            return float('inf')  # Pure chaos
        
        # Normalize amplitudes as probabilities
        total_amp = sum(abs(a) for a in self.modes.values())
        if total_amp == 0:
            return float('inf')
        
        probs = [abs(a) / total_amp for a in self.modes.values()]
        
        # Shannon entropy
        entropy = 0
        for p in probs:
            if p > 0:
                entropy -= p * math.log2(p)
        
        return entropy


# =============================================================================
# VACUUM CHAOS SIMULATOR
# =============================================================================

class VacuumChaosSimulator:
    """
    Simulates the chaotic vacuum before the first oscillation.
    
    The vacuum is not empty — it seethes with virtual particles.
    They appear and disappear constantly.
    
    Chaos → No persistent structure → No information
    
    What happens when ONE oscillation persists?
    """
    
    def __init__(self, 
                 fluctuation_rate: float = 1e40,  # Fluctuations per second per volume
                 volume: float = 1e-45):  # Cubic meters (Planck volume scale)
        self.fluctuation_rate = fluctuation_rate
        self.volume = volume
        self.fluctuations: List[VacuumFluctuation] = []
        self.state = VacuumState.CHAOS
    
    def generate_fluctuation(self) -> VacuumFluctuation:
        """
        Generate a random vacuum fluctuation.
        
        Virtual particles with random energy,
        existing for Δt ≈ ℏ/ΔE.
        """
        # Energy from exponential distribution (typical of quantum fluctuations)
        mean_energy = PLANCK_CONSTANT * 1e15  # Around visible light frequency
        energy = random.expovariate(1 / mean_energy)
        
        # Lifetime from uncertainty principle: Δt ≈ ℏ/ΔE
        lifetime = REDUCED_PLANCK / energy
        
        # Random position within volume
        size = self.volume ** (1/3)
        position = (
            random.uniform(-size/2, size/2),
            random.uniform(-size/2, size/2),
            random.uniform(-size/2, size/2)
        )
        
        return VacuumFluctuation(
            energy=energy,
            lifetime=lifetime,
            position=position
        )
    
    def simulate_chaos(self, duration: float = 1e-20, 
                       n_samples: int = 1000) -> Dict[str, Any]:
        """
        Simulate vacuum chaos over a time period.
        
        Returns statistics about the fluctuations.
        """
        fluctuations = [self.generate_fluctuation() for _ in range(n_samples)]
        
        energies = [f.energy for f in fluctuations]
        lifetimes = [f.lifetime for f in fluctuations]
        lambda_masses = [f.lambda_mass for f in fluctuations]
        
        return {
            "duration": duration,
            "n_fluctuations": n_samples,
            "energy_stats": {
                "mean_j": np.mean(energies),
                "std_j": np.std(energies),
                "min_j": np.min(energies),
                "max_j": np.max(energies)
            },
            "lifetime_stats": {
                "mean_s": np.mean(lifetimes),
                "std_s": np.std(lifetimes),
                "min_s": np.min(lifetimes),
                "max_s": np.max(lifetimes)
            },
            "lambda_mass_stats": {
                "mean_kg": np.mean(lambda_masses),
                "total_kg": np.sum(lambda_masses),
                "density_kg_m3": np.sum(lambda_masses) / self.volume
            },
            "state": "CHAOS - No persistent structure",
            "information_content": 0  # Chaos carries no information
        }
    
    def seed_primordial_oscillation(self, 
                                    frequency: float = 5.45e14,  # Visible light
                                    amplitude: float = 1.0) -> PrimordialLambda:
        """
        THE KEY MOMENT: One oscillation persists.
        
        This is spontaneous symmetry breaking.
        The vacuum "chooses" a state.
        
        Before: Chaos (symmetric — all states equally probable)
        After: Order (one oscillation dominates)
        """
        self.state = VacuumState.SEEDING
        
        primordial = PrimordialLambda(
            frequency=frequency,
            amplitude=amplitude,
            phase=0,  # Arbitrary phase becomes THE phase
            coherence_time=float('inf')  # It persists forever
        )
        
        return primordial
    
    def crystallize_field(self, primordial: PrimordialLambda) -> LambdaField:
        """
        The primordial oscillation seeds the field.
        
        Like a seed crystal in supersaturated solution,
        the first oscillation organizes the chaos around it.
        
        Chaos → Field
        """
        self.state = VacuumState.CRYSTALLIZING
        
        # Create the field from the primordial oscillation
        lambda_field = LambdaField(primordial=primordial)
        
        self.state = VacuumState.COHERENT
        
        return lambda_field


# =============================================================================
# THE GENESIS SEQUENCE
# =============================================================================

class GenesisSequence:
    """
    Models the transition from chaos to order.
    
    The Genesis Sequence:
    1. CHAOS - Pure vacuum fluctuations (unmanageable energy)
    2. FLUCTUATION - Virtual particles appearing/disappearing
    3. SEEDING - One oscillation begins to persist
    4. CRYSTALLIZATION - Field structure emerges
    5. COHERENCE - Stable Lambda Field established
    
    This is the birth of structure from nothing.
    """
    
    def __init__(self):
        self.vacuum = VacuumChaosSimulator()
        self.primordial: Optional[PrimordialLambda] = None
        self.field: Optional[LambdaField] = None
        self.timeline: List[Dict[str, Any]] = []
    
    def run_genesis(self, 
                    primordial_frequency: float = 5.45e14,
                    verbose: bool = True) -> Dict[str, Any]:
        """
        Run the complete genesis sequence.
        
        From chaos to coherent field.
        """
        results = {}
        
        # Stage 1: Chaos
        if verbose:
            print("Stage 1: CHAOS - The vacuum seethes with fluctuations...")
        
        chaos_stats = self.vacuum.simulate_chaos()
        results["chaos"] = chaos_stats
        self.timeline.append({
            "stage": "CHAOS",
            "state": VacuumState.CHAOS,
            "description": "Unmanageable energy - no structure"
        })
        
        # Stage 2: Seeding
        if verbose:
            print("Stage 2: SEEDING - One oscillation begins to persist...")
        
        self.primordial = self.vacuum.seed_primordial_oscillation(
            frequency=primordial_frequency
        )
        results["primordial"] = {
            "frequency_hz": self.primordial.frequency,
            "wavelength_nm": self.primordial.wavelength_nm,
            "energy_j": self.primordial.energy,
            "lambda_mass_kg": self.primordial.lambda_mass
        }
        self.timeline.append({
            "stage": "SEEDING",
            "state": VacuumState.SEEDING,
            "description": f"First Lambda at {self.primordial.wavelength_nm:.1f}nm"
        })
        
        # Stage 3: Crystallization
        if verbose:
            print("Stage 3: CRYSTALLIZATION - Field structure emerges...")
        
        self.field = self.vacuum.crystallize_field(self.primordial)
        results["field"] = {
            "total_energy_j": self.field.total_energy,
            "total_lambda_mass_kg": self.field.total_lambda_mass,
            "num_modes": len(self.field.modes),
            "entropy": self.field.entropy(),
            "zero_point_energy_j": self.field.zero_point_energy_per_mode
        }
        self.timeline.append({
            "stage": "CRYSTALLIZATION",
            "state": VacuumState.CRYSTALLIZING,
            "description": f"Field with {len(self.field.modes)} modes"
        })
        
        # Stage 4: Coherence
        if verbose:
            print("Stage 4: COHERENCE - Stable Lambda Field established!")
        
        self.timeline.append({
            "stage": "COHERENCE",
            "state": VacuumState.COHERENT,
            "description": "Structure from chaos"
        })
        
        # Calculate order emergence
        chaos_entropy = float('inf')  # Chaos = infinite entropy
        field_entropy = self.field.entropy()
        
        results["transformation"] = {
            "initial_state": "Chaos (infinite entropy)",
            "final_state": "Coherent Field",
            "field_entropy": field_entropy,
            "structure_created": True,
            "information_capacity_bits": math.log2(len(self.field.modes))
        }
        
        return results
    
    def visualize_genesis(self) -> str:
        """Create ASCII visualization of genesis."""
        diagram = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                        THE GENESIS SEQUENCE                                   ║
║                    From Chaos to Lambda Field                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   CHAOS                    SEEDING                 FIELD                     ║
║   ~~~~~~                   ~~~~~~~                 ~~~~~                     ║
║                                                                              ║
║   . · * ·.  · *           ∿∿∿∿∿∿∿∿               ═══════════                ║
║   *  ·  . *·  .            ∿∿∿∿∿                  ║ λ₁ ║                     ║
║   · *. · * ·. *     →     ∿∿∿∿∿∿∿∿     →        ║ λ₂ ║                     ║
║   .* · * .· *              ∿∿∿∿∿                  ║ λ₃ ║                     ║
║   * .· * . ·               ∿∿∿∿∿∿∿∿               ═══════════                ║
║                                                                              ║
║   Virtual particles      First Lambda            Organized modes             ║
║   pop in/out             persists                carry information           ║
║                                                                              ║
║   Entropy: ∞             Entropy: ↓              Entropy: finite             ║
║   Information: 0         Structure: emerging     Information: bits           ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║   THE KEY INSIGHT:                                                           ║
║                                                                              ║
║   The vacuum is not empty — it's unmanageable energy.                        ║
║   When ONE oscillation persists, it seeds the field.                         ║
║   The field IS the organizing principle.                                     ║
║   Lambda Boson (Λ = hf/c²) is oscillation made mass.                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
        return diagram


# =============================================================================
# RESEARCH ANALYSIS
# =============================================================================

class LambdaFieldAnalyzer:
    """
    Analyze the Lambda Field hypothesis.
    """
    
    def analyze_vacuum_to_field_transition(self, 
                                            primordial_wavelength_nm: float = 550) -> Dict[str, Any]:
        """
        Full analysis of the vacuum → field transition.
        """
        genesis = GenesisSequence()
        frequency = SPEED_OF_LIGHT / (primordial_wavelength_nm * 1e-9)
        
        results = genesis.run_genesis(
            primordial_frequency=frequency,
            verbose=False
        )
        
        return {
            "hypothesis": "Lambda oscillation is the first organizing principle",
            "primordial_wavelength_nm": primordial_wavelength_nm,
            "stages": genesis.timeline,
            "chaos_properties": results["chaos"],
            "primordial_properties": results["primordial"],
            "field_properties": results["field"],
            "transformation": results["transformation"],
            "key_insights": [
                "Vacuum fluctuations are temporary (Δt ≈ ℏ/ΔE)",
                "Primordial oscillation persists (coherence → ∞)",
                "Field emerges as harmonics of the primordial",
                "Structure replaces chaos through symmetry breaking",
                f"Lambda mass of primordial: {results['primordial']['lambda_mass_kg']:.4e} kg"
            ]
        }
    
    def compare_chaos_vs_field(self) -> Dict[str, Any]:
        """
        Compare properties of chaos vs organized field.
        """
        return {
            "chaos": {
                "structure": "None - random fluctuations",
                "entropy": "Maximum (∞)",
                "information": "Zero",
                "persistence": "None - virtual particles annihilate",
                "predictability": "None",
                "energy_state": "Zero-point fluctuations"
            },
            "lambda_field": {
                "structure": "Harmonic modes from primordial",
                "entropy": "Finite (organized)",
                "information": "Bits encoded in mode amplitudes",
                "persistence": "Infinite coherence",
                "predictability": "Deterministic oscillation",
                "energy_state": "Quantized levels (E = nhf)"
            },
            "transition_mechanism": "Spontaneous symmetry breaking",
            "analogy": "Like a seed crystal organizing supersaturated solution"
        }


# =============================================================================
# DEMONSTRATION
# =============================================================================

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║          THE LAMBDA FIELD HYPOTHESIS                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  "The vacuum is unmanageable energy.                                         ║
║   One Lambda began oscillating first.                                        ║
║   That oscillation IS the field."                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # Run the Genesis Sequence
    print("\n🌌 RUNNING GENESIS SEQUENCE\n")
    print("=" * 60)
    
    genesis = GenesisSequence()
    results = genesis.run_genesis(verbose=True)
    
    print("\n" + "=" * 60)
    print("\n📊 GENESIS RESULTS\n")
    
    print("CHAOS (Before):")
    print(f"  Mean fluctuation energy: {results['chaos']['energy_stats']['mean_j']:.4e} J")
    print(f"  Mean lifetime: {results['chaos']['lifetime_stats']['mean_s']:.4e} s")
    print(f"  Information content: 0 bits")
    
    print("\nPRIMORDIAL LAMBDA (The First):")
    print(f"  Wavelength: {results['primordial']['wavelength_nm']:.1f} nm")
    print(f"  Frequency: {results['primordial']['frequency_hz']:.4e} Hz")
    print(f"  Energy: {results['primordial']['energy_j']:.4e} J")
    print(f"  Lambda Mass: {results['primordial']['lambda_mass_kg']:.4e} kg")
    
    print("\nLAMBDA FIELD (After):")
    print(f"  Total Energy: {results['field']['total_energy_j']:.4e} J")
    print(f"  Total Lambda Mass: {results['field']['total_lambda_mass_kg']:.4e} kg")
    print(f"  Number of Modes: {results['field']['num_modes']}")
    print(f"  Field Entropy: {results['field']['entropy']:.4f} bits")
    print(f"  Zero-Point Energy/Mode: {results['field']['zero_point_energy_j']:.4e} J")
    
    print("\n" + genesis.visualize_genesis())
    
    # Analyze the hypothesis
    print("\n🔬 HYPOTHESIS ANALYSIS")
    print("-" * 40)
    
    analyzer = LambdaFieldAnalyzer()
    comparison = analyzer.compare_chaos_vs_field()
    
    print("\nCHAOS vs LAMBDA FIELD:")
    print(f"  {'Property':<20} {'Chaos':<25} {'Lambda Field':<25}")
    print(f"  {'-'*20} {'-'*25} {'-'*25}")
    for prop in ["structure", "entropy", "information", "persistence"]:
        print(f"  {prop:<20} {comparison['chaos'][prop]:<25} {comparison['lambda_field'][prop]:<25}")
    
    print(f"\n  Transition Mechanism: {comparison['transition_mechanism']}")
    print(f"  Analogy: {comparison['analogy']}")
    
    print("\n✅ Lambda Field Hypothesis module ready!")
    print("\n   Key Equation: Λ = hf/c² (Oscillation IS mass)")
