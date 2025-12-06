"""
WIP Oscillation Field & Tone Interpreter
==========================================

Research module for interpreting oscillation fields and tonal structures
in the Lambda Boson substrate. Studies λ₁ → λ₂ wavelength switching,
harmonic content, and field interference patterns.

Core Physics:
- Λ = hf/c² (Lambda Boson - mass-equivalent of oscillation)
- Field superposition and interference
- Harmonic series and overtone structure
- Coherence and decoherence dynamics

Research Focus:
1. Oscillation Field Dynamics - How oscillators interact in the substrate
2. Tonal Structure - Harmonic relationships like musical scales
3. Wavelength Switching - λ₁ → λ₂ transition mechanics
4. Field Coherence - How information persists across oscillations

Author: NexusOS / WNSP Protocol
License: GNU GPLv3
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum
import math
import time
from datetime import datetime


# =============================================================================
# PHYSICAL CONSTANTS
# =============================================================================

PLANCK_CONSTANT = 6.62607015e-34  # J·s (exact, SI 2019)
SPEED_OF_LIGHT = 299792458  # m/s (exact)
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K (exact)

# Visible light reference
BASE_WAVELENGTH_NM = 550  # Green light (center of visible spectrum)
BASE_FREQUENCY = SPEED_OF_LIGHT / (BASE_WAVELENGTH_NM * 1e-9)

# Musical/Harmonic constants
OCTAVE_RATIO = 2.0  # Frequency doubles per octave
SEMITONE_RATIO = 2 ** (1/12)  # Equal temperament


# =============================================================================
# OSCILLATION FIELD STRUCTURES
# =============================================================================

class FieldMode(Enum):
    """Electromagnetic field modes."""
    TEM = "transverse_electromagnetic"  # E and H perpendicular to propagation
    TE = "transverse_electric"  # No E-field in propagation direction
    TM = "transverse_magnetic"  # No H-field in propagation direction
    HYBRID = "hybrid"  # Both E and H have longitudinal components


class TonalInterval(Enum):
    """Musical intervals in the oscillation field."""
    UNISON = (1, 1.0, "P1")
    MINOR_SECOND = (2, 2**(1/12), "m2")
    MAJOR_SECOND = (3, 2**(2/12), "M2")
    MINOR_THIRD = (4, 2**(3/12), "m3")
    MAJOR_THIRD = (5, 2**(4/12), "M3")
    PERFECT_FOURTH = (6, 2**(5/12), "P4")
    TRITONE = (7, 2**(6/12), "TT")
    PERFECT_FIFTH = (8, 2**(7/12), "P5")
    MINOR_SIXTH = (9, 2**(8/12), "m6")
    MAJOR_SIXTH = (10, 2**(9/12), "M6")
    MINOR_SEVENTH = (11, 2**(10/12), "m7")
    MAJOR_SEVENTH = (12, 2**(11/12), "M7")
    OCTAVE = (13, 2.0, "P8")
    
    def __init__(self, semitones: int, ratio: float, symbol: str):
        self.semitones = semitones
        self.ratio = ratio
        self.symbol = symbol


@dataclass
class Oscillator:
    """
    A single oscillator in the field.
    
    Represents one mode of vibration with full physical properties.
    """
    frequency: float  # Hz
    amplitude: float = 1.0  # Normalized (0-1)
    phase: float = 0.0  # Radians (0 to 2π)
    coherence_time: float = 1.0  # Seconds until decoherence
    polarization: float = 0.0  # Polarization angle (radians)
    mode: FieldMode = FieldMode.TEM
    
    @property
    def wavelength(self) -> float:
        """λ = c/f (meters)"""
        return SPEED_OF_LIGHT / self.frequency
    
    @property
    def wavelength_nm(self) -> float:
        """Wavelength in nanometers."""
        return self.wavelength * 1e9
    
    @property
    def energy(self) -> float:
        """E = hf × A² (energy scales with amplitude squared)"""
        return PLANCK_CONSTANT * self.frequency * (self.amplitude ** 2)
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c² × A² (Lambda Boson mass-equivalent)"""
        return self.energy / (SPEED_OF_LIGHT ** 2)
    
    @property
    def angular_frequency(self) -> float:
        """ω = 2πf (radians per second)"""
        return 2 * math.pi * self.frequency
    
    @property
    def period(self) -> float:
        """T = 1/f (seconds per cycle)"""
        return 1.0 / self.frequency
    
    @property
    def momentum(self) -> float:
        """p = hf/c (photon momentum)"""
        return (PLANCK_CONSTANT * self.frequency) / SPEED_OF_LIGHT
    
    def value_at_time(self, t: float) -> float:
        """
        Get instantaneous oscillation value at time t.
        
        y(t) = A × cos(ωt + φ)
        """
        return self.amplitude * math.cos(self.angular_frequency * t + self.phase)
    
    def value_with_decay(self, t: float, t0: float = 0) -> float:
        """
        Get value with coherence decay.
        
        y(t) = A × cos(ωt + φ) × exp(-(t-t0)/τ)
        """
        age = t - t0
        decay = math.exp(-age / self.coherence_time) if self.coherence_time > 0 else 0
        return self.amplitude * decay * math.cos(self.angular_frequency * t + self.phase)


@dataclass
class OscillationField:
    """
    A field of multiple oscillators creating interference patterns.
    
    The oscillation field is the fundamental substrate where information
    exists as wavelength states. Data IS wavelength, not carried BY wavelength.
    """
    oscillators: List[Oscillator] = field(default_factory=list)
    field_id: str = ""
    created_at: float = field(default_factory=time.time)
    
    def __post_init__(self):
        if not self.field_id:
            self.field_id = f"FIELD-{int(time.time()*1000) % 100000:05d}"
    
    @property
    def total_energy(self) -> float:
        """Total energy of all oscillators."""
        return sum(o.energy for o in self.oscillators)
    
    @property
    def total_lambda_mass(self) -> float:
        """Total Λ mass across all oscillators."""
        return sum(o.lambda_mass for o in self.oscillators)
    
    @property
    def dominant_frequency(self) -> float:
        """Frequency of highest-amplitude oscillator."""
        if not self.oscillators:
            return 0.0
        return max(self.oscillators, key=lambda o: o.amplitude).frequency
    
    @property
    def frequency_range(self) -> Tuple[float, float]:
        """Min and max frequencies in the field."""
        if not self.oscillators:
            return (0.0, 0.0)
        freqs = [o.frequency for o in self.oscillators]
        return (min(freqs), max(freqs))
    
    @property
    def bandwidth(self) -> float:
        """Frequency bandwidth of the field."""
        f_min, f_max = self.frequency_range
        return f_max - f_min
    
    def add_oscillator(self, osc: Oscillator):
        """Add an oscillator to the field."""
        self.oscillators.append(osc)
    
    def superposition(self, t: float) -> float:
        """
        Calculate superposition of all oscillators at time t.
        
        Result is the interference pattern - sum of all waves.
        """
        return sum(o.value_at_time(t) for o in self.oscillators)
    
    def interference_pattern(self, t_start: float, t_end: float, 
                             n_points: int = 1000) -> np.ndarray:
        """
        Calculate interference pattern over time range.
        
        Returns array of superposition values.
        """
        times = np.linspace(t_start, t_end, n_points)
        return np.array([self.superposition(t) for t in times])
    
    def beat_frequency(self) -> Optional[float]:
        """
        Calculate beat frequency between two oscillators.
        
        f_beat = |f₁ - f₂|
        """
        if len(self.oscillators) < 2:
            return None
        
        # Use two highest amplitude oscillators
        sorted_oscs = sorted(self.oscillators, key=lambda o: o.amplitude, reverse=True)
        f1 = sorted_oscs[0].frequency
        f2 = sorted_oscs[1].frequency
        return abs(f1 - f2)


# =============================================================================
# WAVELENGTH SWITCHING (λ₁ → λ₂)
# =============================================================================

@dataclass
class WavelengthTransition:
    """
    Represents a wavelength transition (λ₁ → λ₂).
    
    This is the core mechanism of oscillating encoding that provides
    the 5x capacity increase in the Lambda substrate.
    """
    lambda_1: float  # Initial wavelength (nm)
    lambda_2: float  # Target wavelength (nm)
    transition_time: float = 1e-15  # Femtoseconds (typical optical)
    efficiency: float = 1.0  # Energy transfer efficiency
    
    @property
    def frequency_1(self) -> float:
        """Initial frequency (Hz)."""
        return SPEED_OF_LIGHT / (self.lambda_1 * 1e-9)
    
    @property
    def frequency_2(self) -> float:
        """Target frequency (Hz)."""
        return SPEED_OF_LIGHT / (self.lambda_2 * 1e-9)
    
    @property
    def energy_1(self) -> float:
        """Energy at λ₁."""
        return PLANCK_CONSTANT * self.frequency_1
    
    @property
    def energy_2(self) -> float:
        """Energy at λ₂."""
        return PLANCK_CONSTANT * self.frequency_2
    
    @property
    def energy_change(self) -> float:
        """ΔE = E₂ - E₁"""
        return self.energy_2 - self.energy_1
    
    @property
    def lambda_mass_1(self) -> float:
        """Lambda mass at λ₁."""
        return self.energy_1 / (SPEED_OF_LIGHT ** 2)
    
    @property
    def lambda_mass_2(self) -> float:
        """Lambda mass at λ₂."""
        return self.energy_2 / (SPEED_OF_LIGHT ** 2)
    
    @property
    def mass_change(self) -> float:
        """ΔΛ = Λ₂ - Λ₁"""
        return self.lambda_mass_2 - self.lambda_mass_1
    
    @property
    def frequency_ratio(self) -> float:
        """f₂/f₁ ratio."""
        return self.frequency_2 / self.frequency_1
    
    @property
    def wavelength_ratio(self) -> float:
        """λ₂/λ₁ ratio."""
        return self.lambda_2 / self.lambda_1
    
    @property
    def tonal_interval(self) -> str:
        """
        Musical interval of the transition.
        
        Based on the frequency ratio, maps to musical scale.
        """
        ratio = self.frequency_ratio
        semitones = 12 * math.log2(ratio) if ratio > 0 else 0
        
        # Find closest interval
        for interval in TonalInterval:
            if abs(semitones - (interval.semitones - 1)) < 0.5:
                return interval.symbol
        
        return f"{semitones:.1f} semitones"
    
    @property
    def is_upward(self) -> bool:
        """True if transition goes to higher frequency (shorter wavelength)."""
        return self.lambda_2 < self.lambda_1
    
    @property
    def encoding_capacity(self) -> float:
        """
        Information capacity of the transition.
        
        Capacity ~ log₂(|λ₁/λ₂ - 1| × bandwidth)
        """
        ratio_diff = abs(self.wavelength_ratio - 1)
        if ratio_diff == 0:
            return 0
        return math.log2(1 + ratio_diff * 100)  # Normalized capacity


class OscillatingEncoder:
    """
    Encodes data using wavelength oscillation (λ₁ ↔ λ₂).
    
    This is the mechanism that provides 5x capacity increase:
    - Each oscillation cycle encodes additional information
    - States alternate between λ₁ and λ₂
    - Interference between states carries encoded data
    """
    
    def __init__(self, 
                 lambda_1_nm: float = 550,  # Green
                 lambda_2_nm: float = 450,  # Blue
                 oscillation_rate: float = 1e12):  # THz
        self.lambda_1 = lambda_1_nm
        self.lambda_2 = lambda_2_nm
        self.oscillation_rate = oscillation_rate
        self.transition = WavelengthTransition(lambda_1_nm, lambda_2_nm)
    
    @property
    def encoding_bits_per_cycle(self) -> float:
        """Bits encoded per oscillation cycle."""
        return self.transition.encoding_capacity
    
    @property
    def data_rate(self) -> float:
        """Data rate in bits per second."""
        return self.encoding_bits_per_cycle * self.oscillation_rate
    
    def encode(self, data: bytes) -> OscillationField:
        """
        Encode bytes as oscillating wavelength states.
        
        Each bit determines which wavelength state (λ₁ or λ₂).
        """
        field = OscillationField()
        
        freq_1 = self.transition.frequency_1
        freq_2 = self.transition.frequency_2
        
        for i, byte_val in enumerate(data):
            for bit_pos in range(8):
                bit = (byte_val >> (7 - bit_pos)) & 1
                
                # Choose frequency based on bit value
                frequency = freq_2 if bit else freq_1
                
                # Phase encodes position
                phase = ((i * 8 + bit_pos) / (len(data) * 8)) * 2 * math.pi
                
                # Amplitude encodes significance
                amplitude = 0.8 + 0.2 * (bit_pos / 7)  # Higher bits = higher amplitude
                
                osc = Oscillator(
                    frequency=frequency,
                    amplitude=amplitude,
                    phase=phase,
                    coherence_time=1e-9  # Nanosecond coherence
                )
                field.add_oscillator(osc)
        
        return field
    
    def decode(self, field: OscillationField) -> bytes:
        """
        Decode oscillation field back to bytes.
        """
        if not field.oscillators:
            return b""
        
        # Sort by phase (encodes position)
        sorted_oscs = sorted(field.oscillators, key=lambda o: o.phase)
        
        # Threshold frequency for bit decision
        f_threshold = (self.transition.frequency_1 + self.transition.frequency_2) / 2
        
        bits = []
        for osc in sorted_oscs:
            bit = 1 if osc.frequency > f_threshold else 0
            bits.append(bit)
        
        # Convert bits to bytes
        byte_values = []
        for i in range(0, len(bits) - 7, 8):
            byte_val = 0
            for j in range(8):
                byte_val = (byte_val << 1) | bits[i + j]
            byte_values.append(byte_val)
        
        return bytes(byte_values)


# =============================================================================
# HARMONIC TONE STRUCTURE
# =============================================================================

@dataclass
class HarmonicTone:
    """
    A tone with fundamental frequency and harmonic overtones.
    
    Like a musical note, the tone has a fundamental pitch
    with overtones that give it timbre/character.
    """
    fundamental: float  # Fundamental frequency (Hz)
    harmonics: List[Tuple[int, float]] = field(default_factory=list)  # (harmonic_number, amplitude)
    
    def __post_init__(self):
        if not self.harmonics:
            # Default harmonic series with natural decay
            self.harmonics = [
                (1, 1.0),    # Fundamental
                (2, 0.5),    # 1st overtone (octave)
                (3, 0.33),   # 2nd overtone
                (4, 0.25),   # 3rd overtone
                (5, 0.2),    # 4th overtone
            ]
    
    @property
    def wavelength(self) -> float:
        """Wavelength of fundamental (nm)."""
        return (SPEED_OF_LIGHT / self.fundamental) * 1e9
    
    @property
    def total_energy(self) -> float:
        """Total energy of all harmonics."""
        total = 0
        for n, amplitude in self.harmonics:
            freq = self.fundamental * n
            total += PLANCK_CONSTANT * freq * (amplitude ** 2)
        return total
    
    @property
    def total_lambda_mass(self) -> float:
        """Total Λ mass of all harmonics."""
        return self.total_energy / (SPEED_OF_LIGHT ** 2)
    
    def to_oscillation_field(self) -> OscillationField:
        """Convert tone to oscillation field."""
        field = OscillationField()
        
        for n, amplitude in self.harmonics:
            freq = self.fundamental * n
            osc = Oscillator(
                frequency=freq,
                amplitude=amplitude,
                phase=0,  # All harmonics start in phase
                coherence_time=1.0 / n  # Higher harmonics decay faster
            )
            field.add_oscillator(osc)
        
        return field
    
    def spectral_content(self) -> Dict[str, Any]:
        """Get spectral content analysis."""
        return {
            "fundamental_hz": self.fundamental,
            "fundamental_wavelength_nm": self.wavelength,
            "num_harmonics": len(self.harmonics),
            "highest_harmonic": max(n for n, _ in self.harmonics),
            "total_energy_j": self.total_energy,
            "total_lambda_mass_kg": self.total_lambda_mass,
            "harmonic_frequencies": [
                {"n": n, "frequency_hz": self.fundamental * n, "amplitude": a}
                for n, a in self.harmonics
            ]
        }


class ToneInterpreter:
    """
    Interprets tonal relationships in the oscillation field.
    
    Maps physics to musical/harmonic concepts for intuitive understanding.
    """
    
    def __init__(self, base_frequency: float = BASE_FREQUENCY):
        self.base_frequency = base_frequency
    
    def frequency_to_note(self, frequency: float) -> str:
        """
        Convert frequency to musical note name.
        
        Uses A4 = 440 Hz as reference.
        """
        A4 = 440.0
        note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        # Semitones from A4
        semitones = 12 * math.log2(frequency / A4)
        
        # A4 is the 9th note (index 9) in octave 4
        total_semitones = int(round(semitones)) + 9 + 4 * 12
        
        octave = total_semitones // 12
        note_index = total_semitones % 12
        
        return f"{note_names[note_index]}{octave}"
    
    def note_to_frequency(self, note: str) -> float:
        """
        Convert musical note to frequency.
        
        Format: Note + Octave (e.g., "A4", "C#5")
        """
        note_offsets = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
            'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        }
        
        # Parse note
        if len(note) == 2:
            note_name, octave = note[0], int(note[1])
        elif len(note) == 3:
            note_name, octave = note[:2], int(note[2])
        else:
            return 440.0  # Default to A4
        
        offset = note_offsets.get(note_name, 9)
        
        # Semitones from A4
        semitones = (octave - 4) * 12 + (offset - 9)
        
        return 440.0 * (2 ** (semitones / 12))
    
    def analyze_interval(self, f1: float, f2: float) -> Dict[str, Any]:
        """
        Analyze the tonal interval between two frequencies.
        """
        ratio = f2 / f1 if f1 > 0 else 1
        cents = 1200 * math.log2(ratio) if ratio > 0 else 0
        semitones = cents / 100
        
        # Find closest musical interval
        closest_interval = None
        min_diff = float('inf')
        
        for interval in TonalInterval:
            diff = abs(math.log2(ratio) - math.log2(interval.ratio)) if ratio > 0 else float('inf')
            if diff < min_diff:
                min_diff = diff
                closest_interval = interval
        
        return {
            "frequency_1_hz": f1,
            "frequency_2_hz": f2,
            "ratio": ratio,
            "cents": cents,
            "semitones": semitones,
            "closest_interval": closest_interval.symbol if closest_interval else "Unknown",
            "interval_name": closest_interval.name if closest_interval else "Unknown",
            "note_1": self.frequency_to_note(f1),
            "note_2": self.frequency_to_note(f2)
        }
    
    def field_tonality(self, field: OscillationField) -> Dict[str, Any]:
        """
        Analyze the overall tonality of an oscillation field.
        """
        if not field.oscillators:
            return {"error": "Empty field"}
        
        frequencies = [o.frequency for o in field.oscillators]
        amplitudes = [o.amplitude for o in field.oscillators]
        
        # Dominant frequency (highest amplitude)
        dominant_idx = amplitudes.index(max(amplitudes))
        dominant_freq = frequencies[dominant_idx]
        
        # Analyze intervals from dominant
        intervals = []
        for i, freq in enumerate(frequencies):
            if i != dominant_idx:
                intervals.append(self.analyze_interval(dominant_freq, freq))
        
        # Check for harmonic series
        is_harmonic = self._check_harmonic_series(frequencies)
        
        return {
            "dominant_frequency_hz": dominant_freq,
            "dominant_note": self.frequency_to_note(dominant_freq),
            "num_oscillators": len(field.oscillators),
            "frequency_range_hz": field.frequency_range,
            "bandwidth_hz": field.bandwidth,
            "is_harmonic_series": is_harmonic,
            "intervals": intervals[:5],  # Top 5 intervals
            "total_energy_j": field.total_energy,
            "total_lambda_mass_kg": field.total_lambda_mass
        }
    
    def _check_harmonic_series(self, frequencies: List[float]) -> bool:
        """Check if frequencies form a harmonic series."""
        if len(frequencies) < 2:
            return False
        
        # Find lowest frequency as potential fundamental
        fundamental = min(frequencies)
        
        # Check if all others are integer multiples
        for freq in frequencies:
            ratio = freq / fundamental
            if abs(ratio - round(ratio)) > 0.05:  # 5% tolerance
                return False
        
        return True


# =============================================================================
# RESEARCH ANALYSIS
# =============================================================================

class OscillationFieldAnalyzer:
    """
    Comprehensive analyzer for oscillation fields and tones.
    
    Provides research-grade analysis of field dynamics,
    tonal structure, and Lambda Boson properties.
    """
    
    def __init__(self):
        self.tone_interpreter = ToneInterpreter()
    
    def analyze_wavelength_switching(self, 
                                      lambda_1_nm: float, 
                                      lambda_2_nm: float) -> Dict[str, Any]:
        """
        Comprehensive analysis of λ₁ → λ₂ wavelength switching.
        """
        transition = WavelengthTransition(lambda_1_nm, lambda_2_nm)
        
        return {
            "transition": {
                "lambda_1_nm": lambda_1_nm,
                "lambda_2_nm": lambda_2_nm,
                "frequency_1_hz": transition.frequency_1,
                "frequency_2_hz": transition.frequency_2,
                "direction": "upward" if transition.is_upward else "downward"
            },
            "energy": {
                "energy_1_j": transition.energy_1,
                "energy_2_j": transition.energy_2,
                "energy_change_j": transition.energy_change,
                "energy_1_ev": transition.energy_1 / 1.602e-19,
                "energy_2_ev": transition.energy_2 / 1.602e-19
            },
            "lambda_mass": {
                "lambda_1_kg": transition.lambda_mass_1,
                "lambda_2_kg": transition.lambda_mass_2,
                "mass_change_kg": transition.mass_change
            },
            "tonality": {
                "frequency_ratio": transition.frequency_ratio,
                "wavelength_ratio": transition.wavelength_ratio,
                "tonal_interval": transition.tonal_interval,
                "note_1": self.tone_interpreter.frequency_to_note(transition.frequency_1),
                "note_2": self.tone_interpreter.frequency_to_note(transition.frequency_2)
            },
            "encoding": {
                "capacity_bits": transition.encoding_capacity,
                "capacity_increase_factor": 1 + abs(transition.wavelength_ratio - 1)
            }
        }
    
    def analyze_harmonic_structure(self, 
                                    fundamental_hz: float,
                                    n_harmonics: int = 8) -> Dict[str, Any]:
        """
        Analyze harmonic structure of a fundamental frequency.
        """
        harmonics = []
        total_energy = 0
        total_lambda = 0
        
        for n in range(1, n_harmonics + 1):
            freq = fundamental_hz * n
            amplitude = 1.0 / n  # Natural harmonic decay
            energy = PLANCK_CONSTANT * freq * (amplitude ** 2)
            lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
            
            harmonics.append({
                "harmonic_number": n,
                "frequency_hz": freq,
                "wavelength_nm": (SPEED_OF_LIGHT / freq) * 1e9,
                "amplitude": amplitude,
                "energy_j": energy,
                "lambda_mass_kg": lambda_mass,
                "note": self.tone_interpreter.frequency_to_note(freq)
            })
            
            total_energy += energy
            total_lambda += lambda_mass
        
        # Spectral centroid
        weighted_freq = sum(h["frequency_hz"] * h["amplitude"]**2 for h in harmonics)
        total_power = sum(h["amplitude"]**2 for h in harmonics)
        centroid = weighted_freq / total_power if total_power > 0 else fundamental_hz
        
        return {
            "fundamental": {
                "frequency_hz": fundamental_hz,
                "wavelength_nm": (SPEED_OF_LIGHT / fundamental_hz) * 1e9,
                "note": self.tone_interpreter.frequency_to_note(fundamental_hz)
            },
            "harmonics": harmonics,
            "totals": {
                "total_energy_j": total_energy,
                "total_lambda_mass_kg": total_lambda,
                "spectral_centroid_hz": centroid,
                "spectral_centroid_note": self.tone_interpreter.frequency_to_note(centroid)
            }
        }
    
    def field_interference_analysis(self, field: OscillationField,
                                     duration: float = 1e-14,
                                     n_points: int = 1000) -> Dict[str, Any]:
        """
        Analyze interference patterns in the oscillation field.
        """
        times = np.linspace(0, duration, n_points)
        pattern = field.interference_pattern(0, duration, n_points)
        
        # Statistical analysis
        mean_amplitude = np.mean(pattern)
        max_amplitude = np.max(pattern)
        min_amplitude = np.min(pattern)
        rms_amplitude = np.sqrt(np.mean(pattern ** 2))
        
        # Frequency content (simple FFT approximation)
        fft = np.fft.fft(pattern)
        freqs = np.fft.fftfreq(n_points, duration / n_points)
        dominant_fft_idx = np.argmax(np.abs(fft[:n_points//2]))
        
        return {
            "duration_s": duration,
            "sample_points": n_points,
            "amplitude_stats": {
                "mean": float(mean_amplitude),
                "max": float(max_amplitude),
                "min": float(min_amplitude),
                "rms": float(rms_amplitude),
                "peak_to_peak": float(max_amplitude - min_amplitude)
            },
            "beat_frequency_hz": field.beat_frequency(),
            "field_properties": {
                "num_oscillators": len(field.oscillators),
                "dominant_frequency_hz": field.dominant_frequency,
                "bandwidth_hz": field.bandwidth,
                "total_energy_j": field.total_energy,
                "total_lambda_mass_kg": field.total_lambda_mass
            }
        }


# =============================================================================
# DEMONSTRATION
# =============================================================================

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WIP OSCILLATION FIELD & TONE INTERPRETER                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Research Module for Lambda Boson Substrate Dynamics                         ║
║  Core Physics: Λ = hf/c²                                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    analyzer = OscillationFieldAnalyzer()
    
    # 1. Wavelength Switching Analysis
    print("\n📊 WAVELENGTH SWITCHING ANALYSIS (λ₁ → λ₂)")
    print("-" * 50)
    
    result = analyzer.analyze_wavelength_switching(550, 450)  # Green to Blue
    print(f"Transition: {result['transition']['lambda_1_nm']}nm → {result['transition']['lambda_2_nm']}nm")
    print(f"Direction: {result['transition']['direction']}")
    print(f"Tonal Interval: {result['tonality']['tonal_interval']}")
    print(f"Notes: {result['tonality']['note_1']} → {result['tonality']['note_2']}")
    print(f"Energy Change: {result['energy']['energy_change_j']:.4e} J")
    print(f"Lambda Mass Change: {result['lambda_mass']['mass_change_kg']:.4e} kg")
    print(f"Encoding Capacity: {result['encoding']['capacity_bits']:.2f} bits/cycle")
    
    # 2. Harmonic Structure
    print("\n🎵 HARMONIC STRUCTURE ANALYSIS")
    print("-" * 50)
    
    fundamental = 5.45e14  # Visible light (550nm)
    harmonics = analyzer.analyze_harmonic_structure(fundamental, 5)
    print(f"Fundamental: {harmonics['fundamental']['frequency_hz']:.2e} Hz ({harmonics['fundamental']['wavelength_nm']:.1f} nm)")
    print(f"Spectral Centroid: {harmonics['totals']['spectral_centroid_hz']:.2e} Hz")
    print(f"Total Energy: {harmonics['totals']['total_energy_j']:.4e} J")
    print(f"Total Λ Mass: {harmonics['totals']['total_lambda_mass_kg']:.4e} kg")
    
    # 3. Oscillating Encoding
    print("\n💾 OSCILLATING ENCODING TEST")
    print("-" * 50)
    
    encoder = OscillatingEncoder(550, 450)
    test_data = b"Hello, Lambda!"
    field = encoder.encode(test_data)
    decoded = encoder.decode(field)
    
    print(f"Original: {test_data}")
    print(f"Field oscillators: {len(field.oscillators)}")
    print(f"Field energy: {field.total_energy:.4e} J")
    print(f"Decoded: {decoded}")
    
    print("\n✅ Oscillation Field & Tone Interpreter ready!")
