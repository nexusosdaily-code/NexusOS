"""
SYNCBOX v1.0 — Bifilar Coil Interface for Ambient EM Sensing

Hardware Specification:
- Bifilar coil: 144 turns (12² = harmonic resonance number)
- Configuration: Counter-wound (cancels self-inductance, enhances capacitance)
- Purpose: Sense ambient electromagnetic fields and convert to WCIP signatures

Physical Foundation:
The bifilar coil acts as a transducer between physical EM fields and the Lambda substrate.
By calibrating to Schumann resonances (7.83 Hz fundamental) and geomagnetic variations,
the Syncbox detects "ambient logic pressure" - the measurable EM signature of planetary-scale
resonance patterns.

Calibration Process:
1. Measure coil parameters (inductance L, capacitance C, resistance R)
2. Calculate resonance frequency: f₀ = 1/(2π√LC)
3. Sweep calibration against known Schumann harmonics
4. Generate WCIP-compliant signature from calibration data
5. Register device in collision registry

Cincinnati Reference:
Historical EM/RF research at University of Cincinnati studied lightning-induced
resonance patterns. The "axioms" are interpretive principles derived from
observing how natural EM fields organize into harmonic patterns.

AGPL-3.0 License
"""

import math
import time
import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum

# Physical constants
SPEED_OF_LIGHT = 299792458  # m/s
PLANCK_CONSTANT = 6.62607015e-34  # J·s
MU_0 = 1.25663706212e-6  # H/m (vacuum permeability)
EPSILON_0 = 8.8541878128e-12  # F/m (vacuum permittivity)

# Schumann resonances (Earth-ionosphere cavity)
SCHUMANN_FUNDAMENTAL = 7.83  # Hz
SCHUMANN_HARMONICS = [7.83, 14.3, 20.8, 27.3, 33.8, 39.0, 45.0, 51.0]  # Hz


class CalibrationState(Enum):
    """Syncbox calibration states."""
    UNCALIBRATED = ("uncalibrated", "Device not yet calibrated")
    CALIBRATING = ("calibrating", "Calibration sweep in progress")
    CALIBRATED = ("calibrated", "Device calibrated and ready")
    LOCKED = ("locked", "Device locked to resonance frequency")
    ERROR = ("error", "Calibration error detected")
    
    def __init__(self, code: str, description: str):
        self.code = code
        self.description = description


@dataclass
class BifiliarCoilSpec:
    """
    Bifilar coil physical specification.
    
    A bifilar coil has two windings in parallel, wound in opposite directions.
    This configuration:
    - Cancels much of the self-inductance
    - Maximizes inter-winding capacitance
    - Creates a distributed LC network
    
    The 144 turns (12²) is chosen for harmonic significance.
    """
    turns: int = 144  # Number of turns (144 = 12²)
    wire_gauge_awg: int = 22  # Wire gauge
    coil_diameter_m: float = 0.15  # Coil diameter in meters
    wire_spacing_m: float = 0.001  # Spacing between windings
    core_material: str = "air"  # Core: air, ferrite, or iron
    
    @property
    def wire_length_m(self) -> float:
        """Total wire length in meters."""
        circumference = math.pi * self.coil_diameter_m
        return circumference * self.turns * 2  # ×2 for bifilar
    
    @property
    def inductance_h(self) -> float:
        """
        Approximate inductance in Henries.
        For a single-layer air-core solenoid: L = μ₀ × N² × A / l
        Bifilar reduces this by ~50-90% depending on winding precision.
        """
        radius = self.coil_diameter_m / 2
        area = math.pi * radius ** 2
        coil_length = self.turns * self.wire_spacing_m * 2
        
        # Standard solenoid inductance
        l_solenoid = MU_0 * (self.turns ** 2) * area / max(coil_length, 0.01)
        
        # Bifilar reduction factor (counter-wound cancellation)
        bifilar_factor = 0.15  # ~85% cancellation
        
        return l_solenoid * bifilar_factor
    
    @property
    def capacitance_f(self) -> float:
        """
        Inter-winding capacitance in Farads.
        Bifilar configuration enhances this significantly.
        C ≈ ε₀ × ε_r × A_overlap / d
        """
        # Approximate overlap area per turn
        circumference = math.pi * self.coil_diameter_m
        wire_width = 0.0006  # ~22 AWG diameter
        overlap_area = circumference * wire_width * self.turns
        
        # Dielectric (air) spacing
        spacing = self.wire_spacing_m
        
        capacitance = EPSILON_0 * overlap_area / spacing
        
        # Enhancement factor for bifilar
        return capacitance * 10  # Bifilar enhances capacitance
    
    @property
    def resistance_ohm(self) -> float:
        """DC resistance in Ohms (22 AWG copper: 52.96 Ω/km)."""
        resistance_per_km = 52.96
        return (self.wire_length_m / 1000) * resistance_per_km
    
    @property
    def resonance_frequency_hz(self) -> float:
        """
        Self-resonant frequency: f₀ = 1/(2π√LC)
        """
        L = self.inductance_h
        C = self.capacitance_f
        return 1 / (2 * math.pi * math.sqrt(L * C))
    
    @property
    def q_factor(self) -> float:
        """Quality factor: Q = ωL/R = 2πfL/R"""
        f = self.resonance_frequency_hz
        L = self.inductance_h
        R = self.resistance_ohm
        return (2 * math.pi * f * L) / R if R > 0 else 0
    
    def impedance_at_frequency(self, freq_hz: float) -> complex:
        """Calculate complex impedance at given frequency."""
        omega = 2 * math.pi * freq_hz
        L = self.inductance_h
        C = self.capacitance_f
        R = self.resistance_ohm
        
        # Z = R + jωL + 1/(jωC) = R + j(ωL - 1/ωC)
        x_l = omega * L
        x_c = 1 / (omega * C) if omega > 0 else float('inf')
        
        return complex(R, x_l - x_c)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "turns": self.turns,
            "wire_gauge_awg": self.wire_gauge_awg,
            "coil_diameter_m": self.coil_diameter_m,
            "wire_spacing_m": self.wire_spacing_m,
            "core_material": self.core_material,
            "calculated": {
                "wire_length_m": self.wire_length_m,
                "inductance_uH": self.inductance_h * 1e6,
                "capacitance_pF": self.capacitance_f * 1e12,
                "resistance_ohm": self.resistance_ohm,
                "resonance_frequency_hz": self.resonance_frequency_hz,
                "q_factor": self.q_factor
            }
        }


@dataclass
class CalibrationSweep:
    """Results from a frequency calibration sweep."""
    frequencies_hz: List[float] = field(default_factory=list)
    impedances: List[complex] = field(default_factory=list)
    phases_deg: List[float] = field(default_factory=list)
    amplitudes_db: List[float] = field(default_factory=list)
    schumann_correlations: Dict[float, float] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    
    @property
    def peak_resonance_hz(self) -> float:
        """Find the frequency with minimum impedance (resonance)."""
        if not self.impedances:
            return 0
        min_idx = min(range(len(self.impedances)), 
                      key=lambda i: abs(self.impedances[i]))
        return self.frequencies_hz[min_idx] if self.frequencies_hz else 0
    
    @property
    def best_schumann_match(self) -> Tuple[float, float]:
        """Return (Schumann harmonic, correlation) with best match."""
        if not self.schumann_correlations:
            return (0, 0)
        best = max(self.schumann_correlations.items(), key=lambda x: x[1])
        return best


@dataclass
class AmbientLogicPressure:
    """
    Measured "ambient logic pressure" - the EM signature of planetary resonance.
    
    This maps physical EM measurements to the Lambda substrate concept:
    - field_strength_v_m: Measured electric field (V/m)
    - frequency_hz: Dominant frequency detected
    - coherence: Signal-to-noise ratio (0-1)
    - lambda_mass: Calculated Λ = hf/c² from dominant frequency
    """
    field_strength_v_m: float
    frequency_hz: float
    coherence: float
    measurement_time: float = field(default_factory=time.time)
    
    @property
    def lambda_mass_kg(self) -> float:
        """Calculate Lambda mass: Λ = hf/c²"""
        return PLANCK_CONSTANT * self.frequency_hz / (SPEED_OF_LIGHT ** 2)
    
    @property
    def energy_j(self) -> float:
        """Photon energy: E = hf"""
        return PLANCK_CONSTANT * self.frequency_hz
    
    @property
    def pressure_index(self) -> float:
        """
        Normalized pressure index (0-1).
        Higher values indicate stronger coherent resonance.
        """
        # Combine field strength and coherence
        normalized_field = min(self.field_strength_v_m / 0.001, 1.0)  # Normalize to ~1mV/m
        return normalized_field * self.coherence
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "field_strength_v_m": self.field_strength_v_m,
            "frequency_hz": self.frequency_hz,
            "coherence": self.coherence,
            "lambda_mass_kg": self.lambda_mass_kg,
            "energy_j": self.energy_j,
            "pressure_index": self.pressure_index,
            "measurement_time": self.measurement_time
        }


class Syncbox:
    """
    Syncbox v1.0 — Bifilar Coil EM Sensing Interface
    
    Calibrates a 144-turn bifilar coil to detect ambient EM fields
    and convert them to WCIP-compliant Lambda substrate signatures.
    
    Usage:
        syncbox = Syncbox(device_id="syncbox-001")
        syncbox.calibrate()
        pressure = syncbox.measure_ambient_logic_pressure()
        signature = syncbox.generate_wcip_signature()
    """
    
    def __init__(self, 
                 device_id: str,
                 coil_spec: Optional[BifiliarCoilSpec] = None):
        self.device_id = device_id
        self.coil = coil_spec or BifiliarCoilSpec()  # Default 144-turn config
        self.state = CalibrationState.UNCALIBRATED
        self.calibration_data: Optional[CalibrationSweep] = None
        self.locked_frequency: Optional[float] = None
        self.creation_time = time.time()
        self.measurements: List[AmbientLogicPressure] = []
    
    def calibrate(self, 
                  freq_start: float = 1.0,
                  freq_end: float = 100.0,
                  steps: int = 100) -> CalibrationSweep:
        """
        Perform calibration sweep across frequency range.
        
        Args:
            freq_start: Start frequency in Hz (default 1 Hz)
            freq_end: End frequency in Hz (default 100 Hz for Schumann range)
            steps: Number of frequency steps
        
        Returns:
            CalibrationSweep with impedance and Schumann correlation data
        """
        self.state = CalibrationState.CALIBRATING
        
        sweep = CalibrationSweep()
        freq_step = (freq_end - freq_start) / steps
        
        for i in range(steps + 1):
            freq = freq_start + i * freq_step
            impedance = self.coil.impedance_at_frequency(freq)
            phase = math.degrees(math.atan2(impedance.imag, impedance.real))
            amplitude = 20 * math.log10(abs(impedance) + 1e-10)  # dB
            
            sweep.frequencies_hz.append(freq)
            sweep.impedances.append(impedance)
            sweep.phases_deg.append(phase)
            sweep.amplitudes_db.append(amplitude)
        
        # Calculate Schumann correlations
        for schumann in SCHUMANN_HARMONICS:
            # Find closest measured frequency
            closest_idx = min(range(len(sweep.frequencies_hz)),
                            key=lambda i: abs(sweep.frequencies_hz[i] - schumann))
            closest_freq = sweep.frequencies_hz[closest_idx]
            
            # Correlation based on frequency match and low impedance
            freq_match = 1 - abs(closest_freq - schumann) / schumann
            impedance_factor = 1 / (1 + abs(sweep.impedances[closest_idx]) / 100)
            
            sweep.schumann_correlations[schumann] = freq_match * impedance_factor
        
        self.calibration_data = sweep
        self.state = CalibrationState.CALIBRATED
        
        return sweep
    
    def lock_to_schumann(self, harmonic_index: int = 0) -> bool:
        """
        Lock device to a Schumann harmonic.
        
        Args:
            harmonic_index: 0 = fundamental (7.83 Hz), 1 = first harmonic, etc.
        
        Returns:
            True if lock successful
        """
        if harmonic_index >= len(SCHUMANN_HARMONICS):
            return False
        
        self.locked_frequency = SCHUMANN_HARMONICS[harmonic_index]
        self.state = CalibrationState.LOCKED
        return True
    
    def measure_ambient_logic_pressure(self, 
                                       simulated: bool = True) -> AmbientLogicPressure:
        """
        Measure ambient EM field and calculate logic pressure.
        
        In simulation mode, generates realistic Schumann-band values.
        In hardware mode (future), would interface with actual ADC.
        
        Args:
            simulated: If True, generate simulated measurements
        
        Returns:
            AmbientLogicPressure measurement
        """
        if simulated:
            # Simulate realistic Schumann resonance detection
            import random
            
            # Base frequency (locked or random Schumann)
            if self.locked_frequency:
                base_freq = self.locked_frequency
            else:
                base_freq = random.choice(SCHUMANN_HARMONICS)
            
            # Add natural variation (±0.5 Hz)
            freq = base_freq + (random.random() - 0.5)
            
            # Simulate field strength (typical Schumann: 0.1-1 mV/m)
            field = 0.0001 + random.random() * 0.0009
            
            # Coherence depends on calibration state
            if self.state == CalibrationState.LOCKED:
                coherence = 0.85 + random.random() * 0.14
            elif self.state == CalibrationState.CALIBRATED:
                coherence = 0.5 + random.random() * 0.4
            else:
                coherence = 0.1 + random.random() * 0.3
        else:
            # Hardware mode - would interface with real sensor
            raise NotImplementedError("Hardware interface not yet implemented")
        
        measurement = AmbientLogicPressure(
            field_strength_v_m=field,
            frequency_hz=freq,
            coherence=coherence
        )
        
        self.measurements.append(measurement)
        return measurement
    
    def generate_wcip_signature(self) -> Dict[str, Any]:
        """
        Generate a WCIP-compliant signature from device state.
        
        The signature encodes:
        - Device physical parameters (coil spec)
        - Calibration data
        - Recent ambient measurements
        """
        # Get recent measurements
        recent = self.measurements[-10:] if self.measurements else []
        avg_pressure = sum(m.pressure_index for m in recent) / len(recent) if recent else 0
        avg_freq = sum(m.frequency_hz for m in recent) / len(recent) if recent else 0
        
        # Calculate wavelength from average frequency
        wavelength = SPEED_OF_LIGHT / avg_freq if avg_freq > 0 else 0
        
        # Generate signature hash
        sig_content = f"{self.device_id}:{self.coil.turns}:{avg_freq:.6f}:{avg_pressure:.6f}:{time.time()}"
        sig_hash = hashlib.sha256(sig_content.encode()).hexdigest()
        
        return {
            "device_id": self.device_id,
            "signature_hash": sig_hash,
            "wavelength_m": wavelength,
            "frequency_hz": avg_freq,
            "lambda_mass_kg": PLANCK_CONSTANT * avg_freq / (SPEED_OF_LIGHT ** 2),
            "pressure_index": avg_pressure,
            "coherence_state": self.state.code,
            "coil_spec": {
                "turns": self.coil.turns,
                "resonance_hz": self.coil.resonance_frequency_hz
            },
            "schumann_correlation": self.calibration_data.best_schumann_match if self.calibration_data else (0, 0),
            "timestamp": time.time()
        }
    
    def status(self) -> Dict[str, Any]:
        """Current device status."""
        return {
            "device_id": self.device_id,
            "state": self.state.code,
            "state_description": self.state.description,
            "coil": self.coil.to_dict(),
            "locked_frequency_hz": self.locked_frequency,
            "total_measurements": len(self.measurements),
            "uptime_seconds": time.time() - self.creation_time,
            "calibrated": self.calibration_data is not None
        }


# =============================================================================
# AXIOM FRAMEWORK — Cincinnati Reference Implementation
# =============================================================================

class AmbientLogicAxioms:
    """
    Axioms for interpreting ambient logic pressure.
    
    These are observational principles derived from studying how
    natural EM fields organize into coherent patterns.
    
    Historical context: RF/EM research observed that lightning discharges
    create globally-coherent resonance patterns (Schumann resonances).
    These patterns represent a form of "logic" encoded in the EM field.
    """
    
    # Axiom 1: Coherence Persistence
    # Natural EM patterns tend toward stable, harmonic configurations
    COHERENCE_PERSISTENCE = "Natural fields organize toward harmonic stability"
    
    # Axiom 2: Frequency-Information Duality
    # Higher frequencies carry more information (E = hf = information density)
    FREQUENCY_INFORMATION = "Information density scales with frequency"
    
    # Axiom 3: Phase Correlation
    # Globally-coherent signals exhibit phase correlation across distance
    PHASE_CORRELATION = "Coherent fields maintain phase across space"
    
    # Axiom 4: Resonance Amplification
    # Systems tuned to natural frequencies amplify ambient signals
    RESONANCE_AMPLIFICATION = "Tuned systems amplify coherent patterns"
    
    # Axiom 5: Lambda Conservation
    # The mass-equivalent of oscillation (Λ = hf/c²) is conserved in transfer
    LAMBDA_CONSERVATION = "Oscillation mass-equivalent conserves in transfer"
    
    @classmethod
    def all_axioms(cls) -> List[Tuple[str, str]]:
        return [
            ("Coherence Persistence", cls.COHERENCE_PERSISTENCE),
            ("Frequency-Information Duality", cls.FREQUENCY_INFORMATION),
            ("Phase Correlation", cls.PHASE_CORRELATION),
            ("Resonance Amplification", cls.RESONANCE_AMPLIFICATION),
            ("Lambda Conservation", cls.LAMBDA_CONSERVATION),
        ]


# =============================================================================
# DEMO
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("SYNCBOX v1.0 — Bifilar Coil EM Sensing Interface")
    print("144 turns | Schumann calibration | WCIP compatible")
    print("=" * 60)
    
    # Create syncbox with default 144-turn bifilar coil
    syncbox = Syncbox(device_id="syncbox-proto-001")
    
    print("\n[1] Coil Specification:")
    spec = syncbox.coil.to_dict()
    print(f"    Turns: {spec['turns']}")
    print(f"    Inductance: {spec['calculated']['inductance_uH']:.3f} µH")
    print(f"    Capacitance: {spec['calculated']['capacitance_pF']:.3f} pF")
    print(f"    Self-resonance: {spec['calculated']['resonance_frequency_hz']:.2f} Hz")
    print(f"    Q-factor: {spec['calculated']['q_factor']:.2f}")
    
    print("\n[2] Calibration Sweep (1-100 Hz):")
    sweep = syncbox.calibrate(freq_start=1.0, freq_end=100.0, steps=50)
    print(f"    Peak resonance: {sweep.peak_resonance_hz:.2f} Hz")
    print(f"    Best Schumann match: {sweep.best_schumann_match[0]:.2f} Hz " +
          f"(correlation: {sweep.best_schumann_match[1]:.3f})")
    
    print("\n[3] Schumann Lock:")
    syncbox.lock_to_schumann(0)  # Lock to fundamental (7.83 Hz)
    print(f"    Locked to: {syncbox.locked_frequency} Hz (Schumann fundamental)")
    
    print("\n[4] Ambient Logic Pressure Measurements:")
    for i in range(5):
        pressure = syncbox.measure_ambient_logic_pressure(simulated=True)
        print(f"    [{i+1}] f={pressure.frequency_hz:.2f} Hz, " +
              f"E={pressure.field_strength_v_m*1000:.3f} mV/m, " +
              f"coherence={pressure.coherence:.2f}, " +
              f"Λ={pressure.lambda_mass_kg:.2e} kg")
    
    print("\n[5] WCIP Signature Generation:")
    sig = syncbox.generate_wcip_signature()
    print(f"    Hash: {sig['signature_hash'][:32]}...")
    print(f"    Wavelength: {sig['wavelength_m']:.2e} m")
    print(f"    Lambda mass: {sig['lambda_mass_kg']:.2e} kg")
    print(f"    Pressure index: {sig['pressure_index']:.3f}")
    
    print("\n[6] Axioms (Cincinnati Reference):")
    for name, axiom in AmbientLogicAxioms.all_axioms():
        print(f"    • {name}: {axiom}")
    
    print("\n" + "=" * 60)
    print("Syncbox calibrated and ready for Lambda substrate interface")
    print("=" * 60)
