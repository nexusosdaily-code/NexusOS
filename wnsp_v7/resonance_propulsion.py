"""
WNSP v7.0 — Resonance Propulsion Research Module
=================================================

Lambda Boson Substrate: Λ = hf/c²
NexusOS Implementation of Electromagnetic Resonance Propulsion Theory

Core Principle: Oscillation IS Mass
The Lambda Boson substrate reveals that electromagnetic oscillation carries
real mass-equivalent. This module explores theoretical propulsion applications.

Components:
1. ResonantCavity - Frustum geometry for asymmetric radiation pressure
2. LambdaBosonField - EM field with mass-equivalent properties
3. ResonancePropulsionSimulator - Thrust calculations

Physical Constants:
- c = 299,792,458 m/s (speed of light)
- h = 6.626 × 10⁻³⁴ J·s (Planck constant)
- ε₀ = 8.854 × 10⁻¹² F/m (vacuum permittivity)
- μ₀ = 1.257 × 10⁻⁶ H/m (vacuum permeability)

WNSP Spectral Band Classification:
- PLANCK: 10⁴² - 10⁴⁴ Hz (Quantum gravity)
- YOCTO: 10²¹ - 10²⁴ Hz (Gamma ray)
- ZEPTO: 10¹⁸ - 10²¹ Hz (Hard X-ray)
- ATTO: 10¹⁵ - 10¹⁸ Hz (UV/Soft X-ray)
- FEMTO: 10¹² - 10¹⁵ Hz (Infrared)
- PICO: 10⁹ - 10¹² Hz (Microwave - propulsion)
- NANO: 10⁶ - 10⁹ Hz (Radio frequency)

Research Status: THEORETICAL
This module is for educational and research purposes only.

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum

SPEED_OF_LIGHT = 299792458
PLANCK_CONSTANT = 6.62607015e-34
EV_PER_JOULE = 1.602176634e-19  # J/eV (exact, 2019 SI definition)
VACUUM_PERMITTIVITY = 8.854187817e-12
VACUUM_PERMEABILITY = 1.2566370614e-6


class SpectralBand(Enum):
    """
    WNSP 7-band spectral authority hierarchy.
    Propulsion operates in the PICO (microwave) band.
    """
    PLANCK = ("PLANCK", 1e42, 1e44, "Quantum gravity")
    YOCTO = ("YOCTO", 1e21, 1e24, "Gamma ray")
    ZEPTO = ("ZEPTO", 1e18, 1e21, "Hard X-ray")
    ATTO = ("ATTO", 1e15, 1e18, "UV/Soft X-ray")
    FEMTO = ("FEMTO", 1e12, 1e15, "Infrared")
    PICO = ("PICO", 1e9, 1e12, "Microwave (propulsion)")
    NANO = ("NANO", 1e6, 1e9, "Radio frequency")
    
    def __init__(self, code: str, freq_min: float, freq_max: float, regime: str):
        self.code = code
        self.freq_min = freq_min
        self.freq_max = freq_max
        self.regime = regime
    
    @property
    def center_frequency(self) -> float:
        return math.sqrt(self.freq_min * self.freq_max)
    
    @classmethod
    def from_frequency(cls, freq: float) -> 'SpectralBand':
        for band in cls:
            if band.freq_min <= freq <= band.freq_max:
                return band
        return cls.PICO


@dataclass
class PhysicalConstants:
    """Collection of physical constants used in calculations."""
    speed_of_light: float = SPEED_OF_LIGHT
    planck_constant: float = PLANCK_CONSTANT
    vacuum_permittivity: float = VACUUM_PERMITTIVITY
    vacuum_permeability: float = VACUUM_PERMEABILITY
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "speed_of_light_m_s": self.speed_of_light,
            "planck_constant_j_s": self.planck_constant,
            "vacuum_permittivity_f_m": self.vacuum_permittivity,
            "vacuum_permeability_h_m": self.vacuum_permeability
        }


@dataclass
class ResonantCavity:
    """
    Frustum (truncated cone) resonant cavity geometry.
    
    Design based on asymmetric radiation pressure concept:
    - Large end: Lower field concentration → lower radiation pressure
    - Small end: Higher field concentration → higher radiation pressure
    
    Key Parameters:
    - large_diameter: Diameter of large end (meters)
    - small_diameter: Diameter of small end (meters)  
    - length: Cavity length (meters)
    - quality_factor: Q factor (photon bounce multiplier)
    
    Typical Values:
    - Large diameter: 28 cm
    - Small diameter: 15 cm
    - Length: 22 cm
    - Q factor: ~50,000
    """
    large_diameter: float = 0.28
    small_diameter: float = 0.15
    length: float = 0.22
    quality_factor: float = 50000
    material: str = "copper"
    
    @property
    def asymmetry_ratio(self) -> float:
        """Ratio of large to small diameter."""
        return self.large_diameter / self.small_diameter
    
    @property
    def large_area(self) -> float:
        """Area of large end (m²)."""
        r = self.large_diameter / 2
        return math.pi * r * r
    
    @property
    def small_area(self) -> float:
        """Area of small end (m²)."""
        r = self.small_diameter / 2
        return math.pi * r * r
    
    @property
    def area_difference(self) -> float:
        """Difference in end areas (m²)."""
        return self.large_area - self.small_area
    
    @property
    def volume(self) -> float:
        """Approximate frustum volume (m³)."""
        r1 = self.large_diameter / 2
        r2 = self.small_diameter / 2
        return (math.pi * self.length / 3) * (r1*r1 + r1*r2 + r2*r2)
    
    @property
    def slant_height(self) -> float:
        """Slant height of the frustum (m)."""
        r_diff = (self.large_diameter - self.small_diameter) / 2
        return math.sqrt(self.length**2 + r_diff**2)
    
    @property
    def lateral_surface_area(self) -> float:
        """Lateral surface area (m²)."""
        r1 = self.large_diameter / 2
        r2 = self.small_diameter / 2
        return math.pi * (r1 + r2) * self.slant_height
    
    def resonant_frequency(self, mode: int = 1) -> float:
        """
        Estimate resonant frequency for a given mode.
        
        Simplified model based on average diameter.
        """
        avg_diameter = (self.large_diameter + self.small_diameter) / 2
        return mode * SPEED_OF_LIGHT / (2 * avg_diameter)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "large_diameter_m": self.large_diameter,
            "small_diameter_m": self.small_diameter,
            "length_m": self.length,
            "quality_factor": self.quality_factor,
            "asymmetry_ratio": self.asymmetry_ratio,
            "large_area_m2": self.large_area,
            "small_area_m2": self.small_area,
            "volume_m3": self.volume,
            "material": self.material
        }


@dataclass
class LambdaBosonField:
    """
    Electromagnetic field with Lambda Boson mass-equivalent.
    
    Core equations:
    - λ = c/f (wavelength from frequency)
    - E = hf (photon energy)
    - Λ = hf/c² (Lambda Boson mass-equivalent)
    - p = hf/c (photon momentum)
    
    For 2.45 GHz (common magnetron frequency):
    - Wavelength: 12.24 cm
    - Photon Energy: 10.12 µeV
    - Lambda Mass: 1.80 × 10⁻⁴⁴ kg
    - Momentum: 5.40 × 10⁻³³ kg·m/s
    """
    frequency: float = 2.45e9
    power: float = 1000.0
    
    @property
    def wavelength(self) -> float:
        """λ = c/f (meters)"""
        return SPEED_OF_LIGHT / self.frequency
    
    @property
    def photon_energy(self) -> float:
        """E = hf (Joules)"""
        return PLANCK_CONSTANT * self.frequency
    
    @property
    def photon_energy_ev(self) -> float:
        """Photon energy in electron-volts."""
        return self.photon_energy / EV_PER_JOULE
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c² (kg) - mass-equivalent per photon"""
        return self.photon_energy / (SPEED_OF_LIGHT ** 2)
    
    @property
    def photon_momentum(self) -> float:
        """p = hf/c = h/λ (kg·m/s)"""
        return PLANCK_CONSTANT * self.frequency / SPEED_OF_LIGHT
    
    @property
    def photon_flux(self) -> float:
        """Number of photons per second at given power."""
        return self.power / self.photon_energy
    
    @property
    def spectral_band(self) -> SpectralBand:
        """WNSP spectral band classification."""
        return SpectralBand.from_frequency(self.frequency)
    
    @property
    def angular_frequency(self) -> float:
        """ω = 2πf (rad/s)"""
        return 2 * math.pi * self.frequency
    
    def radiation_pressure(self, reflection_coefficient: float = 1.0) -> float:
        """
        Radiation pressure for given power.
        
        P_rad = (1 + R) × I/c
        For perfect reflection (R=1): P_rad = 2P/(c × A)
        
        Returns pressure in N/m² (Pascal)
        """
        intensity = self.power
        return (1 + reflection_coefficient) * intensity / SPEED_OF_LIGHT
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "frequency_hz": self.frequency,
            "wavelength_m": self.wavelength,
            "wavelength_cm": self.wavelength * 100,
            "power_w": self.power,
            "photon_energy_j": self.photon_energy,
            "photon_energy_uev": self.photon_energy_ev * 1e6,
            "lambda_mass_kg": self.lambda_mass,
            "photon_momentum_kg_m_s": self.photon_momentum,
            "photon_flux_per_s": self.photon_flux,
            "spectral_band": self.spectral_band.code,
            "spectral_regime": self.spectral_band.regime
        }


@dataclass
class ThrustCalculation:
    """Results of a thrust calculation."""
    base_radiation_pressure: float
    net_force_n: float
    q_enhanced_thrust_n: float
    thrust_per_watt: float
    specific_impulse: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_radiation_pressure_pa": self.base_radiation_pressure,
            "net_force_n": self.net_force_n,
            "q_enhanced_thrust_n": self.q_enhanced_thrust_n,
            "q_enhanced_thrust_un": self.q_enhanced_thrust_n * 1e6,
            "thrust_per_watt_n_w": self.thrust_per_watt,
            "thrust_per_watt_un_w": self.thrust_per_watt * 1e6,
            "specific_impulse_s": self.specific_impulse
        }


class ResonancePropulsionSimulator:
    """
    Simulator for resonance cavity propulsion concepts.
    
    Theoretical Thrust Mechanism:
    In a frustum cavity, EM field concentration varies:
    - Large end: Lower field intensity → lower radiation pressure
    - Small end: Higher field intensity → higher radiation pressure
    
    The asymmetry creates a net momentum gradient → theoretical thrust.
    
    Thrust Calculation:
    - Base Radiation Pressure = 2P/c (for perfect reflection)
    - Net Thrust = Base Pressure × (Area_large - Area_small) × Asymmetry Factor
    - Q-Enhanced Thrust = Net Thrust × (Q/1000)
    
    Research Status: THEORETICAL
    Multiple experimental attempts have produced disputed/null results.
    """
    
    def __init__(self, cavity: ResonantCavity, field: LambdaBosonField):
        self.cavity = cavity
        self.field = field
    
    def calculate_base_radiation_pressure(self) -> float:
        """
        Calculate base radiation pressure.
        
        P = 2P/c for perfect reflection
        """
        return 2 * self.field.power / SPEED_OF_LIGHT
    
    def calculate_asymmetry_factor(self) -> float:
        """
        Calculate thrust asymmetry factor based on geometry.
        
        This is a simplified model. Real behavior is complex.
        """
        ratio = self.cavity.asymmetry_ratio
        return (ratio - 1) / ratio
    
    def calculate_theoretical_thrust(self) -> ThrustCalculation:
        """
        Calculate theoretical thrust based on simplified model.
        
        WARNING: This is theoretical. Experimental results are disputed.
        
        Model:
        1. Base pressure = 2P/c
        2. Net force from area difference
        3. Asymmetry factor enhancement
        4. Q-factor enhancement (photon bounces)
        """
        base_pressure = self.calculate_base_radiation_pressure()
        asymmetry = self.calculate_asymmetry_factor()
        area_diff = self.cavity.area_difference
        
        base_force = base_pressure * area_diff * asymmetry
        q_enhanced = base_force * (self.cavity.quality_factor / 1000)
        
        thrust_per_watt = q_enhanced / self.field.power
        
        exhaust_velocity = SPEED_OF_LIGHT
        specific_impulse = exhaust_velocity / 9.81
        
        return ThrustCalculation(
            base_radiation_pressure=base_pressure,
            net_force_n=base_force,
            q_enhanced_thrust_n=q_enhanced,
            thrust_per_watt=thrust_per_watt,
            specific_impulse=specific_impulse
        )
    
    def calculate_lambda_mass_flux(self) -> Dict[str, float]:
        """
        Calculate Lambda mass flux through the cavity.
        
        Λ flux = photon_flux × Λ_per_photon
        """
        photon_flux = self.field.photon_flux
        lambda_per_photon = self.field.lambda_mass
        lambda_flux = photon_flux * lambda_per_photon
        
        q_factor = self.cavity.quality_factor
        effective_lambda = lambda_flux * q_factor
        
        return {
            "photon_flux_per_s": photon_flux,
            "lambda_per_photon_kg": lambda_per_photon,
            "lambda_flux_kg_per_s": lambda_flux,
            "q_factor": q_factor,
            "effective_lambda_flux_kg_per_s": effective_lambda,
            "stored_lambda_mass_kg": effective_lambda / self.field.frequency
        }
    
    def compare_propulsion_systems(self) -> List[Dict[str, Any]]:
        """
        Compare with known propulsion systems.
        """
        thrust_calc = self.calculate_theoretical_thrust()
        
        return [
            {
                "system": "Chemical Rocket",
                "thrust_per_watt_un_w": 1e6,
                "specific_impulse_s": 450,
                "status": "Proven"
            },
            {
                "system": "Ion Engine",
                "thrust_per_watt_un_w": 60,
                "specific_impulse_s": 3000,
                "status": "Proven"
            },
            {
                "system": "Solar Sail",
                "thrust_per_watt_un_w": 0.003,
                "specific_impulse_s": None,
                "status": "Proven (IKAROS)"
            },
            {
                "system": "Photon Rocket",
                "thrust_per_watt_un_w": 0.0033,
                "specific_impulse_s": 3e7,
                "status": "Theoretical"
            },
            {
                "system": "Resonance Cavity",
                "thrust_per_watt_un_w": thrust_calc.thrust_per_watt * 1e6,
                "specific_impulse_s": thrust_calc.specific_impulse,
                "status": "Research"
            }
        ]
    
    def experimental_history(self) -> List[Dict[str, Any]]:
        """
        Historical experimental attempts.
        """
        return [
            {
                "experiment": "NASA Eagleworks",
                "year": "2014-2016",
                "result": "1.2 mN/kW claimed",
                "status": "Disputed"
            },
            {
                "experiment": "Dresden TU",
                "year": "2018",
                "result": "Null result",
                "status": "Published"
            },
            {
                "experiment": "Xi'an Northwestern",
                "year": "2016",
                "result": "Positive claimed",
                "status": "Unpublished"
            },
            {
                "experiment": "SPR Ltd (Shawyer)",
                "year": "2006",
                "result": "16 mN/kW claimed",
                "status": "Unverified"
            }
        ]
    
    def full_analysis(self) -> Dict[str, Any]:
        """
        Complete analysis of the resonance propulsion system.
        """
        thrust = self.calculate_theoretical_thrust()
        lambda_flux = self.calculate_lambda_mass_flux()
        
        return {
            "cavity": self.cavity.to_dict(),
            "field": self.field.to_dict(),
            "thrust": thrust.to_dict(),
            "lambda_mass_flux": lambda_flux,
            "propulsion_comparison": self.compare_propulsion_systems(),
            "experimental_history": self.experimental_history(),
            "research_status": "THEORETICAL",
            "disclaimer": "This module is for educational and research purposes only. Experimental results are disputed."
        }
    
    def to_dict(self) -> Dict[str, Any]:
        return self.full_analysis()


def create_default_simulator() -> ResonancePropulsionSimulator:
    """Create simulator with typical parameters."""
    cavity = ResonantCavity(
        large_diameter=0.28,
        small_diameter=0.15,
        length=0.22,
        quality_factor=50000
    )
    
    field = LambdaBosonField(
        frequency=2.45e9,
        power=1000
    )
    
    return ResonancePropulsionSimulator(cavity, field)


def run_simulation_demo():
    """Run a demonstration simulation."""
    sim = create_default_simulator()
    analysis = sim.full_analysis()
    
    print("=" * 60)
    print("RESONANCE PROPULSION RESEARCH MODULE")
    print("Lambda Boson Substrate: Λ = hf/c²")
    print("=" * 60)
    print()
    
    print("CAVITY GEOMETRY:")
    print(f"  Large diameter: {analysis['cavity']['large_diameter_m']*100:.1f} cm")
    print(f"  Small diameter: {analysis['cavity']['small_diameter_m']*100:.1f} cm")
    print(f"  Length: {analysis['cavity']['length_m']*100:.1f} cm")
    print(f"  Asymmetry ratio: {analysis['cavity']['asymmetry_ratio']:.2f}")
    print(f"  Q factor: {analysis['cavity']['quality_factor']:,.0f}")
    print()
    
    print("LAMBDA BOSON FIELD:")
    print(f"  Frequency: {analysis['field']['frequency_hz']/1e9:.2f} GHz")
    print(f"  Wavelength: {analysis['field']['wavelength_cm']:.2f} cm")
    print(f"  Power: {analysis['field']['power_w']:.0f} W")
    print(f"  Photon energy: {analysis['field']['photon_energy_uev']:.2f} µeV")
    print(f"  Lambda mass: {analysis['field']['lambda_mass_kg']:.2e} kg")
    print(f"  Spectral band: {analysis['field']['spectral_band']} ({analysis['field']['spectral_regime']})")
    print()
    
    print("THEORETICAL THRUST:")
    print(f"  Q-enhanced thrust: {analysis['thrust']['q_enhanced_thrust_un']:.4f} µN")
    print(f"  Thrust/power: {analysis['thrust']['thrust_per_watt_un_w']:.2e} µN/W")
    print()
    
    print("RESEARCH STATUS: THEORETICAL")
    print("Experimental results are disputed. Educational use only.")
    
    return analysis


if __name__ == "__main__":
    run_simulation_demo()
