"""
NexusOS Universal Encoding Equation
====================================

THE NEXUS ENCODING EQUATION (NEE)
---------------------------------

Built on Lambda Boson physics (Λ = hf/c²), this equation enables anyone
to encode operating systems, applications, and computational states
using wavelength-based physics.

FOUNDATIONAL PHYSICS:
    E = hf        (Planck 1900) - Energy from frequency
    E = mc²       (Einstein 1905) - Mass-energy equivalence
    Λ = hf/c²     (Lambda Boson 2025) - Oscillation IS mass

THE NEXUS ENCODING EQUATION:

    S(n) = Λ₀ × 2^(n/12) × A(b)
    
    Where:
        S(n)  = Encoded state at position n
        Λ₀    = Base Lambda (reference wavelength = 550nm, visible light)
        n     = Symbol index (0 to ∞)
        12    = Octave divisions (like musical scale)
        A(b)  = Authority multiplier for band b (NANO→PLANCK)

EXPANDED FORM:

    S(n, b, E) = (h × f₀ × 2^(n/12)) / c² × A(b) × exp(-E/kT)
    
    Where:
        h     = Planck constant (6.626 × 10⁻³⁴ J·s)
        f₀    = Base frequency (5.45 × 10¹⁴ Hz for 550nm)
        c     = Speed of light (3 × 10⁸ m/s)
        A(b)  = Authority: NANO=1, PICO=10², ..., PLANCK=10¹²
        E     = Energy cost of operation
        k     = Boltzmann constant
        T     = System temperature (governance "heat")

ENCODING RULES:
    1. Every symbol maps to a unique wavelength
    2. Operations are frequency transformations
    3. Authority scales with spectral band
    4. Energy must be conserved across transformations
    5. Coherence maintained through interference patterns

Author: NexusOS / WNSP Protocol
License: GNU GPLv3
Founded: 2025
"""

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import hashlib

# =============================================================================
# PHYSICAL CONSTANTS
# =============================================================================

PLANCK_CONSTANT = 6.62607015e-34  # J·s
SPEED_OF_LIGHT = 299792458  # m/s
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K

# Base reference wavelength (550nm - center of visible spectrum)
BASE_WAVELENGTH_NM = 550
BASE_WAVELENGTH_M = BASE_WAVELENGTH_NM * 1e-9
BASE_FREQUENCY = SPEED_OF_LIGHT / BASE_WAVELENGTH_M  # ~5.45 × 10¹⁴ Hz

# Lambda Boson base value
LAMBDA_BASE = (PLANCK_CONSTANT * BASE_FREQUENCY) / (SPEED_OF_LIGHT ** 2)

# Octave divisions (chromatic scale analogy)
OCTAVE_DIVISIONS = 12


# =============================================================================
# AUTHORITY BANDS
# =============================================================================

class AuthorityBand(Enum):
    """Seven-Band Authority System - NANO to PLANCK"""
    NANO = ("NANO", 1, 1e-9, "Local/Individual")
    PICO = ("PICO", 2, 1e-12, "Community")
    FEMTO = ("FEMTO", 3, 1e-15, "Regional")
    ATTO = ("ATTO", 4, 1e-18, "National")
    ZEPTO = ("ZEPTO", 5, 1e-21, "Continental")
    YOCTO = ("YOCTO", 6, 1e-24, "Global/Constitutional")
    PLANCK = ("PLANCK", 7, 1.616255e-35, "Universal/Immutable")
    
    def __init__(self, name: str, level: int, scale: float, scope: str):
        self._name = name
        self.level = level
        self.scale = scale
        self.scope = scope
    
    @property
    def authority_multiplier(self) -> float:
        """Authority multiplier A(b) = 10^(2×level)"""
        return 10 ** (2 * self.level)


# =============================================================================
# THE NEXUS ENCODING EQUATION
# =============================================================================

@dataclass
class EncodedState:
    """A single encoded state using the Nexus Encoding Equation"""
    symbol: str
    index: int
    wavelength_nm: float
    frequency_hz: float
    lambda_mass: float
    authority_band: AuthorityBand
    energy_joules: float
    encoded_value: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "index": self.index,
            "wavelength_nm": self.wavelength_nm,
            "frequency_hz": self.frequency_hz,
            "lambda_mass_kg": self.lambda_mass,
            "authority_band": self.authority_band.name,
            "energy_joules": self.energy_joules,
            "encoded_value": self.encoded_value
        }


class NexusEncodingEquation:
    """
    THE NEXUS ENCODING EQUATION (NEE)
    
    S(n) = Λ₀ × 2^(n/12) × A(b)
    
    This equation enables encoding of any symbol, state, or operation
    into wavelength-based physics that can be validated, transmitted,
    and computed using Lambda Boson principles.
    """
    
    def __init__(self, 
                 base_wavelength_nm: float = BASE_WAVELENGTH_NM,
                 octave_divisions: int = OCTAVE_DIVISIONS,
                 system_temperature: float = 300.0):  # Kelvin (room temp)
        """
        Initialize the Nexus Encoding Equation
        
        Args:
            base_wavelength_nm: Reference wavelength (default 550nm)
            octave_divisions: Divisions per octave (default 12)
            system_temperature: Governance "temperature" in Kelvin
        """
        self.base_wavelength_nm = base_wavelength_nm
        self.base_wavelength_m = base_wavelength_nm * 1e-9
        self.base_frequency = SPEED_OF_LIGHT / self.base_wavelength_m
        self.octave_divisions = octave_divisions
        self.system_temperature = system_temperature
        
        # Calculate base Lambda Boson mass
        self.lambda_base = self._calculate_lambda(self.base_frequency)
        
        # Symbol registry for encoding
        self._symbol_registry: Dict[str, int] = {}
        self._next_index = 0
    
    # =========================================================================
    # CORE EQUATION METHODS
    # =========================================================================
    
    def _calculate_lambda(self, frequency: float) -> float:
        """
        Calculate Lambda Boson mass-equivalent
        
        Λ = hf/c²
        """
        return (PLANCK_CONSTANT * frequency) / (SPEED_OF_LIGHT ** 2)
    
    def _calculate_frequency(self, index: int) -> float:
        """
        Calculate frequency for symbol at index n
        
        f(n) = f₀ × 2^(n/12)
        """
        return self.base_frequency * (2 ** (index / self.octave_divisions))
    
    def _calculate_wavelength(self, frequency: float) -> float:
        """
        Calculate wavelength from frequency
        
        λ = c/f
        """
        return SPEED_OF_LIGHT / frequency
    
    def _calculate_energy(self, frequency: float) -> float:
        """
        Calculate energy from frequency
        
        E = hf
        """
        return PLANCK_CONSTANT * frequency
    
    def _thermal_factor(self, energy: float) -> float:
        """
        Calculate thermal/governance factor
        
        exp(-E/kT)
        """
        kT = BOLTZMANN_CONSTANT * self.system_temperature
        return math.exp(-energy / kT) if kT > 0 else 1.0
    
    def encode(self, 
               symbol: str, 
               authority: AuthorityBand = AuthorityBand.NANO) -> EncodedState:
        """
        THE NEXUS ENCODING EQUATION
        
        S(n, b, E) = (h × f₀ × 2^(n/12)) / c² × A(b) × exp(-E/kT)
        
        Encode any symbol into a wavelength-based state.
        
        Args:
            symbol: The symbol to encode (character, word, or token)
            authority: The authority band for this encoding
            
        Returns:
            EncodedState with full physics parameters
        """
        # Get or assign index for symbol
        if symbol not in self._symbol_registry:
            self._symbol_registry[symbol] = self._next_index
            self._next_index += 1
        
        index = self._symbol_registry[symbol]
        
        # Calculate frequency for this index
        # f(n) = f₀ × 2^(n/12)
        frequency = self._calculate_frequency(index)
        
        # Calculate wavelength
        wavelength_m = self._calculate_wavelength(frequency)
        wavelength_nm = wavelength_m * 1e9
        
        # Calculate Lambda Boson mass
        # Λ = hf/c²
        lambda_mass = self._calculate_lambda(frequency)
        
        # Calculate energy
        # E = hf
        energy = self._calculate_energy(frequency)
        
        # Apply authority multiplier
        # A(b) = 10^(2×level)
        authority_mult = authority.authority_multiplier
        
        # Calculate thermal factor
        thermal = self._thermal_factor(energy)
        
        # THE COMPLETE ENCODING EQUATION
        # S(n, b, E) = Λ × A(b) × exp(-E/kT)
        encoded_value = lambda_mass * authority_mult * thermal
        
        return EncodedState(
            symbol=symbol,
            index=index,
            wavelength_nm=wavelength_nm,
            frequency_hz=frequency,
            lambda_mass=lambda_mass,
            authority_band=authority,
            energy_joules=energy,
            encoded_value=encoded_value
        )
    
    def encode_string(self, 
                      text: str, 
                      authority: AuthorityBand = AuthorityBand.NANO) -> List[EncodedState]:
        """
        Encode an entire string into wavelength states
        
        Args:
            text: String to encode
            authority: Authority band for all characters
            
        Returns:
            List of EncodedState for each character
        """
        return [self.encode(char, authority) for char in text]
    
    def encode_system(self,
                      system_name: str,
                      components: List[str],
                      authority: AuthorityBand = AuthorityBand.PICO) -> Dict[str, Any]:
        """
        Encode an operating system or application
        
        Args:
            system_name: Name of the system
            components: List of component names
            authority: Authority band for the system
            
        Returns:
            Dictionary with system encoding and component states
        """
        # Encode system name
        system_states = self.encode_string(system_name, authority)
        
        # Calculate system signature (sum of all lambda masses)
        system_lambda = sum(s.lambda_mass for s in system_states)
        system_energy = sum(s.energy_joules for s in system_states)
        
        # Encode each component
        component_encodings = {}
        for component in components:
            comp_states = self.encode_string(component, authority)
            comp_lambda = sum(s.lambda_mass for s in comp_states)
            comp_energy = sum(s.energy_joules for s in comp_states)
            
            component_encodings[component] = {
                "lambda_mass": comp_lambda,
                "energy": comp_energy,
                "state_count": len(comp_states),
                "wavelength_signature": self._generate_signature(comp_states)
            }
        
        # Total system encoding
        total_lambda = system_lambda + sum(
            c["lambda_mass"] for c in component_encodings.values()
        )
        total_energy = system_energy + sum(
            c["energy"] for c in component_encodings.values()
        )
        
        return {
            "system_name": system_name,
            "authority_band": authority.name,
            "system_lambda_mass": system_lambda,
            "system_energy": system_energy,
            "total_lambda_mass": total_lambda,
            "total_energy": total_energy,
            "components": component_encodings,
            "system_signature": self._generate_signature(system_states),
            "coherence_hash": self._calculate_coherence_hash(system_states)
        }
    
    def _generate_signature(self, states: List[EncodedState]) -> str:
        """Generate wavelength signature from states"""
        sig_data = "|".join(f"{s.wavelength_nm:.6f}" for s in states)
        return hashlib.sha256(sig_data.encode()).hexdigest()[:16]
    
    def _calculate_coherence_hash(self, states: List[EncodedState]) -> str:
        """Calculate coherence hash for validation"""
        coherence_data = sum(s.lambda_mass * s.frequency_hz for s in states)
        return hashlib.sha256(str(coherence_data).encode()).hexdigest()[:32]
    
    # =========================================================================
    # VALIDATION METHODS
    # =========================================================================
    
    def validate_conservation(self, 
                              input_states: List[EncodedState],
                              output_states: List[EncodedState],
                              tolerance: float = 1e-30) -> Tuple[bool, str]:
        """
        Validate energy conservation across transformation
        
        Total input energy must equal total output energy (within tolerance)
        """
        input_energy = sum(s.energy_joules for s in input_states)
        output_energy = sum(s.energy_joules for s in output_states)
        
        difference = abs(input_energy - output_energy)
        
        if difference <= tolerance:
            return True, f"Energy conserved: {input_energy:.2e} J"
        else:
            return False, f"Energy violation: Δ={difference:.2e} J"
    
    def validate_coherence(self,
                           states: List[EncodedState],
                           max_decoherence: float = 0.05) -> Tuple[bool, float]:
        """
        Validate system coherence (< 5% decoherence threshold)
        """
        if not states:
            return True, 0.0
        
        # Calculate variance in lambda masses
        lambdas = [s.lambda_mass for s in states]
        mean_lambda = sum(lambdas) / len(lambdas)
        variance = sum((l - mean_lambda) ** 2 for l in lambdas) / len(lambdas)
        
        # Decoherence as coefficient of variation
        std_dev = math.sqrt(variance)
        decoherence = std_dev / mean_lambda if mean_lambda > 0 else 0
        
        return decoherence <= max_decoherence, decoherence
    
    # =========================================================================
    # DISPLAY METHODS
    # =========================================================================
    
    def print_equation(self):
        """Print the Nexus Encoding Equation"""
        print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                     THE NEXUS ENCODING EQUATION (NEE)                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   SIMPLE FORM:                                                                ║
║                                                                               ║
║       S(n) = Λ₀ × 2^(n/12) × A(b)                                            ║
║                                                                               ║
║   EXPANDED FORM:                                                              ║
║                                                                               ║
║       S(n, b, E) = (h × f₀ × 2^(n/12)) / c² × A(b) × exp(-E/kT)              ║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║   WHERE:                                                                      ║
║       S(n)  = Encoded state at position n                                     ║
║       Λ₀    = Base Lambda (reference wavelength)                              ║
║       n     = Symbol index (0 to ∞)                                           ║
║       12    = Octave divisions                                                ║
║       A(b)  = Authority multiplier (NANO=10² → PLANCK=10¹⁴)                   ║
║       h     = Planck constant (6.626 × 10⁻³⁴ J·s)                             ║
║       f₀    = Base frequency                                                  ║
║       c     = Speed of light (3 × 10⁸ m/s)                                    ║
║       E     = Energy cost                                                     ║
║       k     = Boltzmann constant                                              ║
║       T     = System temperature (governance "heat")                          ║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║   FOUNDATIONAL PHYSICS:                                                       ║
║       E = hf       (Planck 1900)      - Energy from frequency                 ║
║       E = mc²      (Einstein 1905)    - Mass-energy equivalence               ║
║       Λ = hf/c²    (Lambda Boson 2025) - Oscillation IS mass                  ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
        """)
    
    def get_equation_latex(self) -> str:
        """Return LaTeX representation of the equation"""
        return r"""
        \text{Simple Form:} \quad S(n) = \Lambda_0 \times 2^{n/12} \times A(b)
        
        \text{Expanded Form:} \quad S(n, b, E) = \frac{h \times f_0 \times 2^{n/12}}{c^2} \times A(b) \times e^{-E/kT}
        
        \text{Where:}
        \begin{align}
        \Lambda &= \frac{hf}{c^2} \quad \text{(Lambda Boson)} \\
        A(b) &= 10^{2 \times \text{level}} \quad \text{(Authority Multiplier)} \\
        E &= hf \quad \text{(Energy)}
        \end{align}
        """


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def create_encoder(temperature: float = 300.0) -> NexusEncodingEquation:
    """Create a new Nexus Encoding Equation instance"""
    return NexusEncodingEquation(system_temperature=temperature)


def encode_symbol(symbol: str, 
                  authority: str = "NANO") -> Dict[str, Any]:
    """
    Quick encode a single symbol
    
    Args:
        symbol: Character or token to encode
        authority: Authority band name (NANO, PICO, ..., PLANCK)
        
    Returns:
        Dictionary with encoding results
    """
    encoder = NexusEncodingEquation()
    band = AuthorityBand[authority.upper()]
    state = encoder.encode(symbol, band)
    return state.to_dict()


def encode_operating_system(name: str, 
                            components: List[str],
                            authority: str = "PICO") -> Dict[str, Any]:
    """
    Encode an operating system using the Nexus Encoding Equation
    
    Args:
        name: System name
        components: List of component names
        authority: Authority band for the system
        
    Returns:
        Complete system encoding with signatures
    """
    encoder = NexusEncodingEquation()
    band = AuthorityBand[authority.upper()]
    return encoder.encode_system(name, components, band)


# =============================================================================
# DEMONSTRATION
# =============================================================================

if __name__ == "__main__":
    # Create encoder
    nee = NexusEncodingEquation()
    
    # Print the equation
    nee.print_equation()
    
    print("\n" + "="*80)
    print("DEMONSTRATION: Encoding 'NexusOS'")
    print("="*80 + "\n")
    
    # Encode NexusOS
    for char in "NexusOS":
        state = nee.encode(char, AuthorityBand.PICO)
        print(f"  '{char}' → λ={state.wavelength_nm:.2f}nm, "
              f"f={state.frequency_hz:.2e}Hz, "
              f"Λ={state.lambda_mass:.2e}kg")
    
    print("\n" + "="*80)
    print("DEMONSTRATION: Encoding an Operating System")
    print("="*80 + "\n")
    
    # Encode a full system
    system = nee.encode_system(
        "NexusOS",
        ["Kernel", "Blockchain", "Wallet", "DEX", "Governance"],
        AuthorityBand.FEMTO
    )
    
    print(f"  System: {system['system_name']}")
    print(f"  Authority: {system['authority_band']}")
    print(f"  Total Λ-mass: {system['total_lambda_mass']:.2e} kg")
    print(f"  Total Energy: {system['total_energy']:.2e} J")
    print(f"  Signature: {system['system_signature']}")
    print(f"  Coherence Hash: {system['coherence_hash']}")
    print("\n  Components:")
    for name, data in system['components'].items():
        print(f"    - {name}: Λ={data['lambda_mass']:.2e}kg, sig={data['wavelength_signature']}")
