"""
Wave Computation Layer - NexusOS Civilization OS
Replaces binary computation with electromagnetic wave state encoding

This module implements the foundational physics layer where information,
computation, and validation are based on wave parameters instead of 0/1 binary.
"""

import numpy as np
from dataclasses import dataclass
from typing import Tuple, List, Optional
from enum import Enum

class Modulation(Enum):
    """Wave modulation types for encoding information"""
    ASK = "Amplitude Shift Keying"
    FSK = "Frequency Shift Keying"
    PSK = "Phase Shift Keying"
    OOK = "On-Off Keying"
    QAM = "Quadrature Amplitude Modulation"

class Polarization(Enum):
    """Electromagnetic polarization states"""
    LINEAR_H = "Horizontal"
    LINEAR_V = "Vertical"
    CIRCULAR_L = "Left Circular"
    CIRCULAR_R = "Right Circular"
    ELLIPTICAL = "Elliptical"

@dataclass
class WaveState:
    """
    Primitive information unit in wave-based computation
    Replaces binary bit with multi-dimensional wave parameters
    """
    wavelength: float  # λ in nanometers
    frequency: float   # f in Hz (derived from c/λ)
    amplitude: float   # A (normalized 0-1)
    phase: float      # φ in radians (0-2π)
    polarization: Polarization
    modulation: Modulation
    
    def __post_init__(self):
        """Validate wave parameters against physical constraints"""
        c = 299792458  # Speed of light in m/s
        
        # Ensure wavelength is in valid EM spectrum (1nm - 1m)
        if not (1e-9 <= self.wavelength <= 1.0):
            raise ValueError(f"Wavelength {self.wavelength}m outside valid EM spectrum")
        
        # Verify frequency-wavelength relationship: f = c/λ
        expected_freq = c / self.wavelength
        if abs(self.frequency - expected_freq) / expected_freq > 0.01:
            raise ValueError(f"Frequency {self.frequency} doesn't match wavelength {self.wavelength}")
        
        # Amplitude must be normalized
        if not (0 <= self.amplitude <= 1):
            raise ValueError(f"Amplitude {self.amplitude} must be between 0 and 1")
        
        # Phase must be in valid range
        if not (0 <= self.phase < 2 * np.pi):
            self.phase = self.phase % (2 * np.pi)
    
    def energy(self) -> float:
        """
        Calculate quantum energy using E = hf
        This is the foundational economic pricing function
        """
        h = 6.62607015e-34  # Planck's constant (J·s)
        return h * self.frequency
    
    def to_spectral_region(self) -> str:
        """Map wavelength to spectral region for governance"""
        λ_nm = self.wavelength * 1e9  # Convert to nanometers
        
        if λ_nm < 10:
            return "X-RAY"
        elif λ_nm < 380:
            return "UV"
        elif λ_nm < 450:
            return "VIOLET"
        elif λ_nm < 495:
            return "BLUE"
        elif λ_nm < 570:
            return "GREEN"
        elif λ_nm < 590:
            return "YELLOW"
        elif λ_nm < 620:
            return "ORANGE"
        elif λ_nm < 750:
            return "RED"
        elif λ_nm < 1e6:
            return "IR"
        else:
            return "MICROWAVE"
    
    def __repr__(self) -> str:
        return (f"WaveState(λ={self.wavelength*1e9:.1f}nm, "
                f"f={self.frequency:.2e}Hz, A={self.amplitude:.2f}, "
                f"φ={self.phase:.2f}rad, {self.polarization.name}, {self.modulation.name})")


class WaveComputation:
    """
    Wave-based computation engine
    Performs operations using interference, superposition, and coherence
    """
    
    @staticmethod
    def create_state(wavelength_nm: float, amplitude: float = 1.0, 
                    phase: float = 0.0, polarization: Polarization = Polarization.LINEAR_H,
                    modulation: Modulation = Modulation.ASK) -> WaveState:
        """Create a wave state from wavelength in nanometers"""
        c = 299792458  # Speed of light
        wavelength_m = wavelength_nm * 1e-9
        frequency = c / wavelength_m
        
        return WaveState(
            wavelength=wavelength_m,
            frequency=frequency,
            amplitude=amplitude,
            phase=phase,
            polarization=polarization,
            modulation=modulation
        )
    
    @staticmethod
    def superposition(states: List[WaveState]) -> np.ndarray:
        """
        Compute wave superposition (interference pattern)
        Used for message validation and consensus
        """
        if not states:
            return np.array([0])
        
        # Time samples for interference calculation
        t = np.linspace(0, 1e-9, 1000)  # 1 nanosecond window
        
        # Sum all wave contributions
        total = np.zeros_like(t)
        for state in states:
            wave = state.amplitude * np.sin(2 * np.pi * state.frequency * t + state.phase)
            total += wave
        
        return total
    
    @staticmethod
    def coherence_factor(states: List[WaveState]) -> float:
        """
        Calculate coherence between wave states
        High coherence = valid consensus
        Low coherence = conflicting states
        """
        if len(states) < 2:
            return 1.0
        
        # Calculate phase coherence
        phases = np.array([s.phase for s in states])
        phase_variance = np.var(phases)
        
        # Calculate frequency coherence
        frequencies = np.array([s.frequency for s in states])
        freq_variance = np.var(frequencies) / np.mean(frequencies)**2
        
        # Combined coherence score (0-1, higher is more coherent)
        coherence = np.exp(-(phase_variance + freq_variance))
        
        return float(coherence)
    
    @staticmethod
    def interference_signature(states: List[WaveState]) -> str:
        """
        Generate unique interference signature for validation
        Replaces cryptographic hash with physics-based fingerprint
        """
        # Compute superposition
        interference = WaveComputation.superposition(states)
        
        # Extract signature features
        peak_amplitude = np.max(np.abs(interference))
        zero_crossings = np.sum(np.diff(np.sign(interference)) != 0)
        energy = np.sum(interference**2)
        
        # Generate signature string
        signature = f"INT-{peak_amplitude:.6f}-{zero_crossings:04d}-{energy:.6e}"
        
        return signature
    
    @staticmethod
    def validate_spectral_diversity(states: List[WaveState], min_regions: int = 5) -> bool:
        """
        Validate that wave states span enough spectral regions
        Ensures decentralization in Proof of Spectrum
        """
        regions = set(s.to_spectral_region() for s in states)
        return len(regions) >= min_regions


class WaveMessage:
    """
    Message encoded as sequence of wave states
    Replaces text/binary messages with electromagnetic encoding
    """
    
    def __init__(self, wave_sequence: List[WaveState], metadata: Optional[dict] = None):
        self.waves = wave_sequence
        self.metadata = metadata or {}
        self.signature = WaveComputation.interference_signature(wave_sequence)
    
    def total_energy(self) -> float:
        """Calculate total energy cost of message (E = Σhf)"""
        return sum(w.energy() for w in self.waves)
    
    def spectral_diversity(self) -> int:
        """Count unique spectral regions in message"""
        regions = set(w.to_spectral_region() for w in self.waves)
        return len(regions)
    
    def coherence(self) -> float:
        """Measure message coherence (validation metric)"""
        return WaveComputation.coherence_factor(self.waves)
    
    def __repr__(self) -> str:
        return (f"WaveMessage(states={len(self.waves)}, "
                f"energy={self.total_energy():.2e}J, "
                f"regions={self.spectral_diversity()}, "
                f"signature={self.signature})")


# Example usage and testing
if __name__ == "__main__":
    print("=" * 70)
    print("WAVE COMPUTATION LAYER - NexusOS Civilization OS")
    print("=" * 70)
    
    # Create wave states across spectrum
    red = WaveComputation.create_state(650, amplitude=0.8)
    green = WaveComputation.create_state(550, amplitude=0.9)
    blue = WaveComputation.create_state(475, amplitude=0.7)
    
    print("\n1. WAVE STATES:")
    print(f"   Red:   {red}")
    print(f"   Green: {green}")
    print(f"   Blue:  {blue}")
    
    print("\n2. QUANTUM ENERGIES (E=hf):")
    print(f"   Red:   {red.energy():.2e} J")
    print(f"   Green: {green.energy():.2e} J")
    print(f"   Blue:  {blue.energy():.2e} J")
    
    print("\n3. SPECTRAL REGIONS:")
    print(f"   Red:   {red.to_spectral_region()}")
    print(f"   Green: {green.to_spectral_region()}")
    print(f"   Blue:  {blue.to_spectral_region()}")
    
    # Create message
    message = WaveMessage([red, green, blue], metadata={"sender": "Citizen-001"})
    
    print("\n4. WAVE MESSAGE:")
    print(f"   {message}")
    print(f"   Coherence: {message.coherence():.4f}")
    
    # Validate spectral diversity
    print("\n5. CONSENSUS VALIDATION:")
    is_valid = WaveComputation.validate_spectral_diversity([red, green, blue], min_regions=3)
    print(f"   Spectral diversity check: {is_valid}")
    print(f"   Coherence factor: {WaveComputation.coherence_factor([red, green, blue]):.4f}")
    
    print("\n" + "=" * 70)
    print("Wave computation layer initialized successfully!")
    print("=" * 70)
