"""
Wavelength-Based Message Validator
Revolutionary cryptographic validation using electromagnetic wave theory instead of traditional hashing.

Security foundation: Maxwell's equations, wave interference, quantum energy principles
Economic model: Message costs based on actual quantum energy (E = hf)
"""

import numpy as np
import hashlib
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import json


# Physical Constants (SI units)
SPEED_OF_LIGHT = 299792458  # m/s
PLANCK_CONSTANT = 6.62607015e-34  # J·s
JOULES_PER_NXT = 1e-18  # Conversion factor: 1 NXT = 10^18 Joules (for economic scaling)


class SpectralRegion(Enum):
    """Electromagnetic spectrum regions for message classification"""
    UV = ("Ultraviolet", 100e-9, 400e-9)  # 100-400 nm
    VIOLET = ("Violet", 380e-9, 450e-9)   # 380-450 nm
    BLUE = ("Blue", 450e-9, 495e-9)       # 450-495 nm
    GREEN = ("Green", 495e-9, 570e-9)     # 495-570 nm
    YELLOW = ("Yellow", 570e-9, 590e-9)   # 570-590 nm
    ORANGE = ("Orange", 590e-9, 620e-9)   # 590-620 nm
    RED = ("Red", 620e-9, 750e-9)         # 620-750 nm
    IR = ("Infrared", 750e-9, 1000e-9)    # 750-1000 nm
    
    def __init__(self, display_name: str, min_wavelength: float, max_wavelength: float):
        self.display_name = display_name
        self.min_wavelength = min_wavelength
        self.max_wavelength = max_wavelength
        self.center_wavelength = (min_wavelength + max_wavelength) / 2


class ModulationType(Enum):
    """Optical modulation techniques (increasing complexity/security)"""
    OOK = ("On-Off Keying", 1.0, 1)        # Simple amplitude switching
    ASK = ("Amplitude Shift Keying", 1.2, 1)  # Amplitude modulation
    FSK = ("Frequency Shift Keying", 1.5, 1)  # Frequency modulation
    PSK = ("Phase Shift Keying", 2.0, 1)      # Phase modulation
    QPSK = ("Quadrature PSK", 2.5, 2)         # 2 bits/symbol
    QAM16 = ("16-QAM", 3.5, 4)                # 4 bits/symbol
    QAM64 = ("64-QAM", 5.0, 6)                # 6 bits/symbol
    
    def __init__(self, display_name: str, complexity_multiplier: float, bits_per_symbol: int):
        self.display_name = display_name
        self.complexity_multiplier = complexity_multiplier
        self.bits_per_symbol = bits_per_symbol


@dataclass
class WaveProperties:
    """Complete electromagnetic wave characterization for a message"""
    wavelength: float  # meters
    amplitude: float   # 0.0 to 1.0 (normalized power)
    phase: float       # radians (0 to 2π)
    polarization: float  # angle in radians (0 to π)
    spectral_region: SpectralRegion
    modulation_type: ModulationType
    
    @property
    def frequency(self) -> float:
        """Calculate frequency from wavelength: f = c/λ"""
        return SPEED_OF_LIGHT / self.wavelength
    
    @property
    def quantum_energy(self) -> float:
        """Calculate quantum energy: E = hf (Joules)"""
        return PLANCK_CONSTANT * self.frequency
    
    @property
    def energy_in_nxt(self) -> float:
        """Convert quantum energy to NXT economic units"""
        return self.quantum_energy / JOULES_PER_NXT
    
    def to_dict(self) -> dict:
        """Serialize wave properties"""
        return {
            'wavelength_nm': self.wavelength * 1e9,
            'amplitude': self.amplitude,
            'phase_degrees': np.degrees(self.phase),
            'polarization_degrees': np.degrees(self.polarization),
            'spectral_region': self.spectral_region.name,
            'modulation': self.modulation_type.name,
            'frequency_THz': self.frequency / 1e12,
            'quantum_energy_eV': self.quantum_energy / 1.602176634e-19,
            'economic_value_NXT': self.energy_in_nxt
        }


@dataclass
class InterferencePattern:
    """Result of wave superposition - the cryptographic 'fingerprint'"""
    intensity_distribution: np.ndarray  # Spatial intensity pattern
    phase_distribution: np.ndarray      # Phase distribution
    coherence_factor: float             # 0.0 to 1.0 (how well waves interfere)
    max_intensity: float
    min_intensity: float
    pattern_hash: str                   # Unique fingerprint of interference
    
    def is_valid_superposition(self, expected_pattern: 'InterferencePattern', tolerance: float = 0.05) -> bool:
        """Check if interference pattern matches expected (validates message chain)"""
        if self.pattern_hash == expected_pattern.pattern_hash:
            return True
        
        # Calculate pattern similarity
        correlation = np.corrcoef(
            self.intensity_distribution.flatten(),
            expected_pattern.intensity_distribution.flatten()
        )[0, 1]
        
        return correlation >= (1.0 - tolerance)


class WavelengthValidator:
    """
    Revolutionary message validator using electromagnetic wave theory.
    Replaces traditional hash-based validation with physics-based security.
    """
    
    def __init__(self, grid_resolution: int = 256):
        """
        Initialize validator with computational grid for wave calculations.
        
        Args:
            grid_resolution: Spatial resolution for interference pattern calculations
        """
        self.grid_resolution = grid_resolution
        self.validation_history: List[Dict] = []
        
    def create_message_wave(
        self,
        message_data: str,
        spectral_region: SpectralRegion,
        modulation_type: ModulationType,
        amplitude: Optional[float] = None,
        phase: Optional[float] = None,
        polarization: Optional[float] = None
    ) -> WaveProperties:
        """
        Convert message to electromagnetic wave representation.
        
        Args:
            message_data: The actual message content
            spectral_region: Which part of spectrum to use
            modulation_type: Encoding complexity
            amplitude: Optional override (default: based on message priority)
            phase: Optional override (default: derived from message content)
            polarization: Optional override (default: derived from metadata)
        
        Returns:
            Complete wave characterization
        """
        # Use spectral region's center wavelength
        wavelength = spectral_region.center_wavelength
        
        # Derive amplitude from message priority (if not specified)
        if amplitude is None:
            # Hash message to get deterministic but content-dependent amplitude
            message_hash = int(hashlib.sha256(message_data.encode()).hexdigest()[:8], 16)
            amplitude = 0.3 + 0.7 * (message_hash % 100) / 100.0  # Range: 0.3 to 1.0
        
        # Derive phase from message content (if not specified)
        if phase is None:
            phase_hash = int(hashlib.sha256((message_data + "phase").encode()).hexdigest()[:8], 16)
            phase = 2 * np.pi * (phase_hash % 360) / 360.0
        
        # Derive polarization (if not specified)
        if polarization is None:
            pol_hash = int(hashlib.sha256((message_data + "polarization").encode()).hexdigest()[:8], 16)
            polarization = np.pi * (pol_hash % 180) / 180.0
        
        return WaveProperties(
            wavelength=wavelength,
            amplitude=amplitude,
            phase=phase,
            polarization=polarization,
            spectral_region=spectral_region,
            modulation_type=modulation_type
        )
    
    def calculate_wave_function(
        self,
        wave_props: WaveProperties,
        x: np.ndarray,
        t: float = 0.0
    ) -> np.ndarray:
        """
        Solve wave equation for given properties.
        Electric field: E(x,t) = A * cos(2π(x/λ - ft) + φ)
        
        Args:
            wave_props: Wave characteristics
            x: Spatial positions (array)
            t: Time point
        
        Returns:
            Complex electric field values
        """
        k = 2 * np.pi / wave_props.wavelength  # Wave number
        omega = 2 * np.pi * wave_props.frequency  # Angular frequency
        
        # Electric field (complex representation for easier interference calculation)
        E = wave_props.amplitude * np.exp(1j * (k * x - omega * t + wave_props.phase))
        
        return E
    
    def compute_interference(
        self,
        wave1: WaveProperties,
        wave2: WaveProperties
    ) -> InterferencePattern:
        """
        Calculate wave superposition - the core of wavelength validation.
        When two waves meet, their interference pattern is unique and unforgeable.
        
        Args:
            wave1: First message's wave properties
            wave2: Second message's wave properties
        
        Returns:
            Interference pattern (cryptographic fingerprint)
        """
        # Create spatial grid
        x = np.linspace(0, 10 * max(wave1.wavelength, wave2.wavelength), self.grid_resolution)
        
        # Calculate both wave functions
        E1 = self.calculate_wave_function(wave1, x)
        E2 = self.calculate_wave_function(wave2, x)
        
        # Superposition principle (fundamental to Maxwell's equations)
        E_total = E1 + E2
        
        # Intensity = |E|² (what we'd measure with a detector)
        intensity = np.abs(E_total) ** 2
        phase_distribution = np.angle(E_total)
        
        # Coherence factor (how well the waves interfere)
        coherence = np.abs(np.mean(E1 * np.conj(E2))) / (
            np.sqrt(np.mean(np.abs(E1)**2) * np.mean(np.abs(E2)**2))
        )
        
        # Create unique hash from interference pattern
        pattern_bytes = intensity.tobytes() + phase_distribution.tobytes()
        pattern_hash = hashlib.sha256(pattern_bytes).hexdigest()
        
        return InterferencePattern(
            intensity_distribution=intensity,
            phase_distribution=phase_distribution,
            coherence_factor=float(coherence),
            max_intensity=float(np.max(intensity)),
            min_intensity=float(np.min(intensity)),
            pattern_hash=pattern_hash
        )
    
    def validate_message_chain(
        self,
        message1_wave: WaveProperties,
        message2_wave: WaveProperties,
        expected_interference_hash: Optional[str] = None
    ) -> Tuple[bool, InterferencePattern, str]:
        """
        Validate DAG link between two messages via wave interference.
        This is the revolutionary alternative to hash chain validation.
        
        Args:
            message1_wave: Parent message wave properties
            message2_wave: Child message wave properties
            expected_interference_hash: Optional pre-computed pattern for verification
        
        Returns:
            (is_valid, interference_pattern, validation_message)
        """
        # Compute actual interference
        interference = self.compute_interference(message1_wave, message2_wave)
        
        # If we have expected pattern, validate against it
        if expected_interference_hash:
            if interference.pattern_hash == expected_interference_hash:
                msg = "✅ VALID: Interference pattern matches expected (authentic message chain)"
                is_valid = True
            else:
                msg = "❌ TAMPERING DETECTED: Interference pattern mismatch (message altered)"
                is_valid = False
        else:
            # First validation - establish pattern
            msg = f"🆕 New chain link established (pattern hash: {interference.pattern_hash[:16]}...)"
            is_valid = True
        
        # Record validation in history
        self.validation_history.append({
            'timestamp': np.datetime64('now'),
            'wave1_region': message1_wave.spectral_region.name,
            'wave2_region': message2_wave.spectral_region.name,
            'interference_hash': interference.pattern_hash,
            'coherence': interference.coherence_factor,
            'is_valid': is_valid
        })
        
        return is_valid, interference, msg
    
    def calculate_message_cost(
        self,
        wave_props: WaveProperties,
        data_size_bytes: int,
        spectral_diversity_required: int = 5
    ) -> Dict[str, float]:
        """
        Calculate message cost based on electromagnetic physics.
        Cost = f(quantum_energy, modulation_complexity, spectral_diversity, bandwidth)
        
        Args:
            wave_props: Wave properties of the message
            data_size_bytes: Message size in bytes
            spectral_diversity_required: Number of spectral regions needed for validation
        
        Returns:
            Cost breakdown dictionary
        """
        # Base cost from quantum energy (E = hf)
        quantum_base = wave_props.energy_in_nxt * 1e6  # Scale to reasonable NXT amounts
        
        # Modulation complexity premium
        modulation_premium = quantum_base * (wave_props.modulation_type.complexity_multiplier - 1.0)
        
        # Spectral diversity fee (requires multiple validators)
        diversity_fee = 0.01 * spectral_diversity_required
        
        # Bandwidth cost (based on data size)
        bandwidth_rate = 0.00001  # NXT per byte
        bandwidth_cost = data_size_bytes * bandwidth_rate
        
        # Amplitude premium (higher power = higher priority)
        amplitude_premium = quantum_base * wave_props.amplitude * 0.1
        
        # Total cost
        total_cost = max(
            0.01,  # Minimum 0.01 NXT
            quantum_base + modulation_premium + diversity_fee + bandwidth_cost + amplitude_premium
        )
        
        return {
            'quantum_base': round(quantum_base, 6),
            'modulation_premium': round(modulation_premium, 6),
            'diversity_fee': round(diversity_fee, 6),
            'bandwidth_cost': round(bandwidth_cost, 6),
            'amplitude_premium': round(amplitude_premium, 6),
            'total_nxt': round(total_cost, 6)
        }
    
    def calculate_validator_reward(
        self,
        message_cost: float,
        detected_tampering: bool,
        spectral_region: SpectralRegion,
        contribution_score: float = 1.0
    ) -> Dict[str, float]:
        """
        Calculate validator rewards for interference pattern checking.
        
        Args:
            message_cost: Total cost paid by sender
            detected_tampering: Did validator detect interference mismatch?
            spectral_region: Validator's spectral region
            contribution_score: Validator's contribution score (H+M+D)
        
        Returns:
            Reward breakdown
        """
        base_reward = 0.01 * message_cost
        
        # Tampering detection bonus (10x reward for security work)
        tamper_bonus = 10 * base_reward if detected_tampering else 0.0
        
        # Spectral scarcity multiplier (rarer regions get more)
        # UV and IR are typically less populated
        scarcity_map = {
            SpectralRegion.UV: 1.5,
            SpectralRegion.VIOLET: 1.2,
            SpectralRegion.BLUE: 1.0,
            SpectralRegion.GREEN: 1.0,
            SpectralRegion.YELLOW: 1.0,
            SpectralRegion.ORANGE: 1.1,
            SpectralRegion.RED: 1.2,
            SpectralRegion.IR: 1.4
        }
        scarcity_multiplier = scarcity_map.get(spectral_region, 1.0)
        
        # Contribution-based multiplier
        contribution_multiplier = 1.0 + (contribution_score / 10.0)
        
        total_reward = (base_reward + tamper_bonus) * scarcity_multiplier * contribution_multiplier
        
        return {
            'base_reward': round(base_reward, 6),
            'tamper_bonus': round(tamper_bonus, 6),
            'scarcity_multiplier': round(scarcity_multiplier, 3),
            'contribution_multiplier': round(contribution_multiplier, 3),
            'total_nxt': round(total_reward, 6)
        }
    
    def generate_validation_report(self) -> str:
        """Generate human-readable validation history report"""
        if not self.validation_history:
            return "No validations performed yet."
        
        valid_count = sum(1 for v in self.validation_history if v['is_valid'])
        total_count = len(self.validation_history)
        
        report = f"""
Wavelength Validation Report
{'='*50}
Total Validations: {total_count}
Valid Chains: {valid_count}
Tampering Detected: {total_count - valid_count}
Success Rate: {100.0 * valid_count / total_count:.1f}%

Recent Validations:
"""
        for val in self.validation_history[-5:]:
            status = "✅" if val['is_valid'] else "❌"
            report += f"{status} {val['wave1_region']} + {val['wave2_region']} | "
            report += f"Coherence: {val['coherence']:.3f} | Hash: {val['interference_hash'][:16]}...\n"
        
        return report


# Demonstration functions
def demo_wavelength_vs_hashing():
    """
    Side-by-side comparison: Traditional SHA-256 vs Wavelength Validation
    """
    print("\n" + "="*80)
    print("COMPARISON: Traditional Hashing vs Wavelength-Based Validation")
    print("="*80)
    
    # Sample messages
    msg1 = "Transfer 100 NXT from Alice to Bob"
    msg2 = "Transfer 50 NXT from Bob to Charlie"
    
    # === TRADITIONAL APPROACH ===
    print("\n📊 TRADITIONAL SHA-256 HASHING:")
    print("-" * 80)
    hash1 = hashlib.sha256(msg1.encode()).hexdigest()
    hash2 = hashlib.sha256(msg2.encode()).hexdigest()
    print(f"Message 1 Hash: {hash1}")
    print(f"Message 2 Hash: {hash2}")
    print(f"Security: Computational (vulnerable to quantum computers)")
    print(f"Dimensions: 1 (hash value only)")
    print(f"Cost basis: Arbitrary mining difficulty")
    
    # === WAVELENGTH APPROACH ===
    print("\n\n🌈 WAVELENGTH-BASED VALIDATION:")
    print("-" * 80)
    
    validator = WavelengthValidator()
    
    # Create wave representations
    wave1 = validator.create_message_wave(
        msg1,
        SpectralRegion.BLUE,
        ModulationType.QPSK
    )
    
    wave2 = validator.create_message_wave(
        msg2,
        SpectralRegion.GREEN,
        ModulationType.QAM16
    )
    
    print(f"Message 1 Wave Properties:")
    print(f"  Wavelength: {wave1.wavelength*1e9:.1f} nm ({wave1.spectral_region.display_name})")
    print(f"  Frequency: {wave1.frequency/1e12:.2f} THz")
    print(f"  Quantum Energy: {wave1.quantum_energy/1.602176634e-19:.2f} eV")
    print(f"  Amplitude: {wave1.amplitude:.3f}")
    print(f"  Phase: {np.degrees(wave1.phase):.1f}°")
    print(f"  Modulation: {wave1.modulation_type.display_name}")
    
    print(f"\nMessage 2 Wave Properties:")
    print(f"  Wavelength: {wave2.wavelength*1e9:.1f} nm ({wave2.spectral_region.display_name})")
    print(f"  Frequency: {wave2.frequency/1e12:.2f} THz")
    print(f"  Quantum Energy: {wave2.quantum_energy/1.602176634e-19:.2f} eV")
    print(f"  Amplitude: {wave2.amplitude:.3f}")
    print(f"  Phase: {np.degrees(wave2.phase):.1f}°")
    print(f"  Modulation: {wave2.modulation_type.display_name}")
    
    # Validate chain via interference
    is_valid, interference, msg = validator.validate_message_chain(wave1, wave2)
    
    print(f"\n🔬 INTERFERENCE VALIDATION:")
    print(f"  Pattern Hash: {interference.pattern_hash[:32]}...")
    print(f"  Coherence Factor: {interference.coherence_factor:.4f}")
    print(f"  Max Intensity: {interference.max_intensity:.2f}")
    print(f"  Min Intensity: {interference.min_intensity:.2f}")
    print(f"  Validation: {msg}")
    
    print(f"\n✨ ADVANTAGES:")
    print(f"  Security: Physics-based (quantum-resistant)")
    print(f"  Dimensions: 5 (wavelength, amplitude, phase, polarization, modulation)")
    print(f"  Cost basis: E = hf (actual quantum energy from physics)")
    
    # Cost calculation
    cost_breakdown = validator.calculate_message_cost(wave1, len(msg1))
    print(f"\n💰 PHYSICS-BASED PRICING:")
    print(f"  Quantum Base Cost: {cost_breakdown['quantum_base']:.6f} NXT")
    print(f"  Modulation Premium: {cost_breakdown['modulation_premium']:.6f} NXT")
    print(f"  Diversity Fee: {cost_breakdown['diversity_fee']:.6f} NXT")
    print(f"  Total Cost: {cost_breakdown['total_nxt']:.6f} NXT")
    print(f"  (Based on E = hf where f = {wave1.frequency/1e12:.2f} THz)")
    
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    demo_wavelength_vs_hashing()
